import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { assets } from '../../db/schema';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseStorageService } from '../../providers/storage.service';

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
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    private readonly projectsService: ProjectsService,
    private readonly storageService: SupabaseStorageService,
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
    const fileExtension = file.originalname.split('.').pop();
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

      // 5. Upload preview version to public-previews bucket
      const publicPath = await this.storageService.uploadFile(
        'public-previews',
        storagePath,
        file.buffer,
        file.mimetype,
      );

      // 6. Get public URL of the preview file
      const publicUrl = this.storageService.getPublicUrl('public-previews', publicPath);

      // 7. Insert asset record in Postgres database
      const [insertedAsset] = await this.client
        .insert(assets)
        .values({
          projectId: project.id,
          assetType,
          fileUrl: privatePath, // Store path in private-assets bucket
          watermarkedUrl: publicUrl, // Store full public URL for preview rendering
        })
        .returning();

      return insertedAsset;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to complete upload workflow: ${(error as Error).message}`,
      );
    }
  }
}
