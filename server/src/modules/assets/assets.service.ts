import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { ProjectStatus } from '@treaty/shared';
import { randomUUID } from 'crypto';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import {
  assets,
  collaborations,
  annotationcoordinates,
  videoannotation,
} from '../../db/schema';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseStorageService } from '../../providers/storage.service';
import { WatermarkService } from '../../providers/watermark.service';
import { buildAnnotationMap } from '../../common/annotation.utils';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    private readonly projectsService: ProjectsService,
    private readonly storageService: SupabaseStorageService,
    private readonly watermarkService: WatermarkService,
  ) {}

  private get client(): DrizzleDB {
    if (!this.db) {
      throw new InternalServerErrorException('Database not available');
    }
    return this.db;
  }

  async findAll(userId: string, projectId: string) {
    // 1. Verify project exists and belongs to user
    await this.projectsService.findOne(userId, projectId);

    // 2. Fetch assets linked to the project with comment counts
    const rows = await this.client
      .select({
        id: assets.id,
        projectId: assets.projectId,
        assetType: assets.assetType,
        fileUrl: assets.fileUrl,
        watermarkedUrl: assets.watermarkedUrl,
        expiresAt: assets.expiresAt,
        commentCount: sql<number>`count(${collaborations.id})::int`,
      })
      .from(assets)
      .leftJoin(collaborations, eq(assets.id, collaborations.assetId))
      .where(eq(assets.projectId, projectId))
      .groupBy(assets.id);

    return rows;
  }

  async upload(userId: string, projectId: string, file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 1. Verify project exists and belongs to user
    const project = await this.projectsService.findOne(userId, projectId);

    // 2. Validate MIME type (images and videos only)
    let assetType: 'image' | 'video';
    if (file.mimetype.startsWith('image/')) {
      assetType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      assetType = 'video';
    } else {
      throw new BadRequestException('Only image and video uploads are allowed');
    }

    // 3. Generate unique file path in the buckets
    const fileExtension = file.originalname.split('.').pop() || '';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const storagePath = `projects/${projectId}/${uniqueFileName}`;

    try {
      // 4. Upload clean version to private-assets bucket
      const privatePath = await this.storageService.uploadFile(
        'private-assets',
        storagePath,
        file.buffer,
        file.mimetype,
      );

      // 5. Insert asset record in Postgres database with watermarkedUrl set to null
      const [insertedAsset] = await this.client
        .insert(assets)
        .values({
          projectId: project.id,
          assetType,
          fileUrl: privatePath,
          watermarkedUrl: null,
          status: 'PROCESSING',
        })
        .returning();

      // 6. Fire the background watermarking process asynchronously
      this.processWatermarkInBackground(
        insertedAsset.id,
        storagePath,
        file.buffer,
        file.mimetype,
        fileExtension,
        assetType,
      ).catch(async (err: Error) => {
        this.logger.error(
          `Background watermarking failed for asset ${insertedAsset.id}: ${err.message}`,
        );
        await this.client
          .update(assets)
          .set({ status: 'FAILED' })
          .where(eq(assets.id, insertedAsset.id))
          .catch((dbErr: Error) =>
            this.logger.error(
              `Failed to mark asset ${insertedAsset.id} as FAILED: ${dbErr.message}`,
            ),
          );
      });

      return insertedAsset;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to complete upload workflow: ${(error as Error).message}`,
      );
    }
  }

  async delete(
    userId: string,
    projectId: string,
    assetId: string,
  ): Promise<void> {
    const project = await this.projectsService.findOne(userId, projectId);

    if ((project.status as ProjectStatus) !== ProjectStatus.DRAFT) {
      throw new BadRequestException(
        'Assets can only be deleted while project is in DRAFT',
      );
    }

    const [asset] = await this.client
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)));

    if (!asset) throw new NotFoundException('Asset not found');

    await this.client.delete(assets).where(eq(assets.id, assetId));

    if (asset.fileUrl) {
      void this.storageService
        .deleteFile('private-assets', asset.fileUrl)
        .catch((err: Error) =>
          this.logger.warn(`Failed to delete private asset: ${err.message}`),
        );
      void this.storageService
        .deleteFile('public-previews', asset.fileUrl)
        .catch((err: Error) =>
          this.logger.warn(`Failed to delete preview: ${err.message}`),
        );
    }
  }

  /**
   * Helper method to watermark media and update database in the background
   */
  private async processWatermarkInBackground(
    assetId: string,
    storagePath: string,
    buffer: Buffer,
    mimeType: string,
    fileExtension: string,
    assetType: 'image' | 'video',
  ) {
    this.logger.log(`Starting background watermarking for asset ${assetId}`);

    let watermarkedBuffer: Buffer;
    if (assetType === 'image') {
      watermarkedBuffer = await this.watermarkService.watermarkImage(buffer);
    } else {
      watermarkedBuffer = await this.watermarkService.watermarkVideo(
        buffer,
        fileExtension,
      );
    }

    // Upload watermarked preview to public-previews bucket
    const publicPath = await this.storageService.uploadFile(
      'public-previews',
      storagePath,
      watermarkedBuffer,
      mimeType,
    );

    // Get public URL of the watermarked preview
    const publicUrl = this.storageService.getPublicUrl(
      'public-previews',
      publicPath,
    );

    // Update database record with the public watermarked URL
    await this.client
      .update(assets)
      .set({ watermarkedUrl: publicUrl, status: 'READY' })
      .where(eq(assets.id, assetId));

    this.logger.log(
      `Successfully completed background watermarking for asset ${assetId}`,
    );
  }

  async getAnnotations(userId: string, projectId: string, assetId: string) {
    // 1. Verify project exists and belongs to user
    await this.projectsService.findOne(userId, projectId);

    // 2. Verify asset belongs to project
    const [asset] = await this.client
      .select()
      .from(assets)
      .where(eq(assets.id, assetId));

    if (!asset || asset.projectId !== projectId) {
      throw new BadRequestException('Asset not found in this project');
    }

    // 3. Fetch all annotations with left joins
    const rows = await this.client
      .select({
        collabId: collaborations.id,
        commentText: collaborations.commentText,
        collaboratorName: collaborations.collaboratorName,
        coordId: annotationcoordinates.id,
        coordX: annotationcoordinates.coordX,
        coordY: annotationcoordinates.coordY,
        boundingBox: annotationcoordinates.boundingBox,
        videoAnnId: videoannotation.id,
        timestampSeconds: videoannotation.timestampSeconds,
        duration: videoannotation.duration,
      })
      .from(collaborations)
      .leftJoin(
        annotationcoordinates,
        eq(collaborations.id, annotationcoordinates.collabId),
      )
      .leftJoin(
        videoannotation,
        eq(collaborations.id, videoannotation.collabId),
      )
      .where(eq(collaborations.assetId, assetId));

    return buildAnnotationMap(rows, (r) => ({
      id: r.collabId,
      assetId,
      commentText: r.commentText,
      collaboratorName: r.collaboratorName,
      coordinates: null,
      video: null,
    }));
  }

  async getAllAnnotations(userId: string, projectId: string) {
    // 1. Verify project exists and belongs to user
    await this.projectsService.findOne(userId, projectId);

    // 2. Fetch all annotations for all assets in the project
    const rows = await this.client
      .select({
        collabId: collaborations.id,
        commentText: collaborations.commentText,
        collaboratorName: collaborations.collaboratorName,
        assetId: collaborations.assetId,
        assetType: assets.assetType,
        coordId: annotationcoordinates.id,
        coordX: annotationcoordinates.coordX,
        coordY: annotationcoordinates.coordY,
        boundingBox: annotationcoordinates.boundingBox,
        videoAnnId: videoannotation.id,
        timestampSeconds: videoannotation.timestampSeconds,
        duration: videoannotation.duration,
      })
      .from(collaborations)
      .innerJoin(assets, eq(collaborations.assetId, assets.id))
      .leftJoin(
        annotationcoordinates,
        eq(collaborations.id, annotationcoordinates.collabId),
      )
      .leftJoin(
        videoannotation,
        eq(collaborations.id, videoannotation.collabId),
      )
      .where(eq(assets.projectId, projectId));

    return buildAnnotationMap(rows, (r) => ({
      id: r.collabId,
      assetId: r.assetId,
      assetType: r.assetType,
      commentText: r.commentText,
      collaboratorName: r.collaboratorName,
      coordinates: null,
      video: null,
    }));
  }
}
