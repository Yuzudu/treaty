import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { ProjectStatus } from '@treaty/shared';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import {
  sharelinks,
  projects,
  assets,
  collaborations,
  annotationcoordinates,
  videoannotation,
} from '../../db/schema';
import { CreateAnnotationDto } from './dto/create-annotation.dto';

@Injectable()
export class ShareLinksService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async create(
    projectId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.db.insert(sharelinks).values({ projectId, token, expiresAt });
    return { token, expiresAt: expiresAt.toISOString() };
  }

  async findByToken(token: string) {
    const [row] = await this.db
      .select({
        token: sharelinks.token,
        projectId: sharelinks.projectId,
        expiresAt: sharelinks.expiresAt,
        projectStatus: projects.status,
        priceCents: projects.priceCents,
        currency: projects.currency,
      })
      .from(sharelinks)
      .innerJoin(projects, eq(sharelinks.projectId, projects.id))
      .where(and(eq(sharelinks.token, token), gt(sharelinks.expiresAt, new Date())));

    if (!row) throw new NotFoundException('Share link not found or expired');
    return { ...row, expiresAt: row.expiresAt.toISOString() };
  }

  async getProjectAndAssetsByToken(token: string) {
    const shareLink = await this.findByToken(token);

    const projectAssets = await this.db
      .select()
      .from(assets)
      .where(eq(assets.projectId, shareLink.projectId));

    return {
      project: {
        id: shareLink.projectId,
        status: shareLink.projectStatus,
        priceCents: shareLink.priceCents,
        currency: shareLink.currency,
      },
      assets: projectAssets.map((asset) => ({
        id: asset.id,
        assetType: asset.assetType,
        watermarkedUrl: asset.watermarkedUrl,
        fileUrl: shareLink.projectStatus === ProjectStatus.PAID ? asset.fileUrl : null,
      })),
    };
  }

  async getFilesForPaidProject(
    token: string,
  ): Promise<{ fileUrl: string; assetType: string }[]> {
    const shareLink = await this.findByToken(token);
    if ((shareLink.projectStatus as ProjectStatus) !== ProjectStatus.PAID) {
      throw new ForbiddenException('Files not yet unlocked — payment not confirmed');
    }
    const rows = await this.db
      .select({ fileUrl: assets.fileUrl, assetType: assets.assetType })
      .from(assets)
      .where(eq(assets.projectId, shareLink.projectId));
    return rows
      .filter((r) => r.fileUrl != null)
      .map((r) => ({ fileUrl: r.fileUrl!, assetType: r.assetType ?? 'file' }));
  }

  async getAnnotations(token: string, assetId: string) {
    const shareLink = await this.findByToken(token);

    // Verify the asset belongs to this project
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, shareLink.projectId)));

    if (!asset) {
      throw new NotFoundException('Asset not found in this project');
    }

    const rows = await this.db
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
      .leftJoin(annotationcoordinates, eq(collaborations.id, annotationcoordinates.collabId))
      .leftJoin(videoannotation, eq(collaborations.id, videoannotation.collabId))
      .where(eq(collaborations.assetId, assetId));

    const resultsMap = new Map<string, any>();
    for (const r of rows) {
      if (!resultsMap.has(r.collabId)) {
        resultsMap.set(r.collabId, {
          id: r.collabId,
          assetId,
          commentText: r.commentText,
          collaboratorName: r.collaboratorName,
          coordinates: null,
          video: null,
        });
      }
      const current = resultsMap.get(r.collabId);
      if (r.coordId) {
        current.coordinates = {
          id: r.coordId,
          coordX: r.coordX,
          coordY: r.coordY,
          boundingBox: r.boundingBox,
        };
      }
      if (r.videoAnnId) {
        current.video = {
          id: r.videoAnnId,
          timestampSeconds: r.timestampSeconds,
          duration: r.duration,
        };
      }
    }
    return Array.from(resultsMap.values());
  }

  async createAnnotation(token: string, assetId: string, dto: CreateAnnotationDto) {
    const shareLink = await this.findByToken(token);

    // Verify the asset belongs to this project
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, shareLink.projectId)));

    if (!asset) {
      throw new NotFoundException('Asset not found in this project');
    }

    return await this.db.transaction(async (tx) => {
      const [newCollab] = await tx
        .insert(collaborations)
        .values({
          assetId,
          commentText: dto.commentText || null,
          collaboratorName: dto.collaboratorName,
        })
        .returning();

      let newCoords: any = null;
      if (dto.coordinates) {
        const [coordRow] = await tx
          .insert(annotationcoordinates)
          .values({
            collabId: newCollab.id,
            coordX: dto.coordinates.coordX != null ? String(dto.coordinates.coordX) : null,
            coordY: dto.coordinates.coordY != null ? String(dto.coordinates.coordY) : null,
            boundingBox: dto.coordinates.boundingBox || null,
          })
          .returning();
        newCoords = coordRow;
      }

      let newVideo: any = null;
      if (dto.video) {
        const [videoRow] = await tx
          .insert(videoannotation)
          .values({
            collabId: newCollab.id,
            timestampSeconds: dto.video.timestampSeconds != null ? String(dto.video.timestampSeconds) : null,
            duration: dto.video.duration != null ? String(dto.video.duration) : null,
          })
          .returning();
        newVideo = videoRow;
      }

      return {
        id: newCollab.id,
        assetId,
        commentText: newCollab.commentText,
        collaboratorName: newCollab.collaboratorName,
        coordinates: newCoords ? {
          id: newCoords.id,
          coordX: newCoords.coordX,
          coordY: newCoords.coordY,
          boundingBox: newCoords.boundingBox,
        } : null,
        video: newVideo ? {
          id: newVideo.id,
          timestampSeconds: newVideo.timestampSeconds,
          duration: newVideo.duration,
        } : null,
      };
    });
  }
}
