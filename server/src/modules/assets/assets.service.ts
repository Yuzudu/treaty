import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { assets } from '../../db/schema';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseStorageService } from '../../providers/storage.service';
import { WatermarkService } from '../../providers/watermark.service';

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

    // 2. Fetch assets linked to the project
    return this.client
      .select()
      .from(assets)
      .where(eq(assets.projectId, projectId));
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
          fileUrl: privatePath, // Store path in private-assets bucket
          watermarkedUrl: null, // Will be generated asynchronously in the background
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
      ).catch((err) => {
        this.logger.error(
          `Background watermarking failed for asset ${insertedAsset.id}: ${err.message}`,
        );
      });

      return insertedAsset;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to complete upload workflow: ${(error as Error).message}`,
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
      watermarkedBuffer = await this.watermarkService.watermarkVideo(buffer, fileExtension);
    }

    // Upload watermarked preview to public-previews bucket
    const publicPath = await this.storageService.uploadFile(
      'public-previews',
      storagePath,
      watermarkedBuffer,
      mimeType,
    );

    // Get public URL of the watermarked preview
    const publicUrl = this.storageService.getPublicUrl('public-previews', publicPath);

    // Update database record with the public watermarked URL
    await this.client
      .update(assets)
      .set({ watermarkedUrl: publicUrl })
      .where(eq(assets.id, assetId));

    this.logger.log(`Successfully completed background watermarking for asset ${assetId}`);
  }
}
