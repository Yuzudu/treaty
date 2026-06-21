import {
  Injectable,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  GoneException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { ProjectStatus } from '@treaty/shared';
import type { SharePreviewDTO } from '@treaty/shared';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import {
  shareLinks,
  projects,
  users,
  assets,
  collaborations,
  annotationcoordinates,
  videoannotation,
} from '../../db/schema';
import { SupabaseStorageService } from '../../providers/storage.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';

@Injectable()
export class ShareLinksService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    private readonly storageService: SupabaseStorageService,
    private readonly configService: ConfigService,
  ) {}

  private get client(): DrizzleDB {
    if (!this.db) throw new InternalServerErrorException('Database not available');
    return this.db;
  }

  async create(projectId: string): Promise<{ token: string }> {
    const token = randomBytes(32).toString('hex');
    await this.client.insert(shareLinks).values({ token, projectId, status: 'ACTIVE' });
    return { token };
  }

  async revoke(projectId: string): Promise<void> {
    await this.client
      .update(shareLinks)
      .set({ status: 'REVOKED' })
      .where(and(eq(shareLinks.projectId, projectId), eq(shareLinks.status, 'ACTIVE')));
  }

  async findByToken(token: string): Promise<{ projectId: string; token: string }> {
    const [link] = await this.client
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token));

    if (!link) throw new NotFoundException('Share link not found');
    if (link.status === 'REVOKED') throw new GoneException('Share link has been revoked');
    return { projectId: link.projectId, token: link.token };
  }

  async getActiveByProjectId(projectId: string): Promise<string | null> {
    const [link] = await this.client
      .select({ token: shareLinks.token })
      .from(shareLinks)
      .where(and(eq(shareLinks.projectId, projectId), eq(shareLinks.status, 'ACTIVE')));
    return link?.token ?? null;
  }

  async getPreview(token: string): Promise<SharePreviewDTO> {
    const shareLink = await this.findByToken(token);

    const [projectRow] = await this.client
      .select({
        title: projects.title,
        status: projects.status,
        priceCents: projects.priceCents,
        currency: projects.currency,
        creatorName: users.name,
      })
      .from(projects)
      .innerJoin(users, eq(users.id, projects.userId))
      .where(eq(projects.id, shareLink.projectId));

    if (!projectRow) throw new NotFoundException('Project not found');

    const assetRows = await this.client
      .select({
        id: assets.id,
        assetType: assets.assetType,
        watermarkedUrl: assets.watermarkedUrl,
        expiresAt: assets.expiresAt,
      })
      .from(assets)
      .where(eq(assets.projectId, shareLink.projectId));

    const expiresAt = assetRows[0]?.expiresAt?.toISOString() ?? null;

    return {
      status: projectRow.status as ProjectStatus,
      title: projectRow.title,
      creatorName: projectRow.creatorName,
      priceCents: projectRow.priceCents,
      currency: projectRow.currency,
      assets: assetRows.map((a) => ({
        id: a.id,
        assetType: a.assetType as 'image' | 'video',
        watermarkedUrl: a.watermarkedUrl,
      })),
      expiresAt,
    };
  }

  async mintDownloadUrl(token: string, assetId: string): Promise<{ url: string }> {
    const shareLink = await this.findByToken(token);

    const [row] = await this.client
      .select({
        projectStatus: projects.status,
        fileUrl: assets.fileUrl,
        expiresAt: assets.expiresAt,
      })
      .from(assets)
      .innerJoin(projects, eq(projects.id, assets.projectId))
      .where(and(
        eq(assets.id, assetId),
        eq(assets.projectId, shareLink.projectId),
      ));

    if (!row) throw new NotFoundException('Asset not found');

    const status = row.projectStatus as ProjectStatus;

    if (status !== ProjectStatus.PAID && status !== ProjectStatus.DELIVERED) {
      throw new BadRequestException('Payment required to download');
    }

    if (row.expiresAt && new Date() > row.expiresAt) {
      throw new GoneException('Download window has closed. Contact the creator for renewed access.');
    }

    if (!row.fileUrl) {
      throw new InternalServerErrorException('Asset file not available');
    }

    const SIGNED_URL_TTL = 300;
    const url = await this.storageService.createSignedUrl('private-assets', row.fileUrl, SIGNED_URL_TTL, true);

    if (status === ProjectStatus.PAID) {
      this.client
        .update(projects)
        .set({ status: ProjectStatus.DELIVERED })
        .where(and(
          eq(projects.id, shareLink.projectId),
          eq(projects.status, ProjectStatus.PAID),
        ))
        .execute()
        .catch((err) => console.error('[mintDownloadUrl] Failed to flip DELIVERED:', err));
    }

    return { url };
  }

  async getAnnotations(token: string, assetId: string) {
    const shareLink = await this.findByToken(token);

    const [asset] = await this.client
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, shareLink.projectId)));

    if (!asset) throw new NotFoundException('Asset not found in this project');

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
        current.coordinates = { id: r.coordId, coordX: r.coordX, coordY: r.coordY, boundingBox: r.boundingBox };
      }
      if (r.videoAnnId) {
        current.video = { id: r.videoAnnId, timestampSeconds: r.timestampSeconds, duration: r.duration };
      }
    }
    return Array.from(resultsMap.values());
  }

  async createAnnotation(token: string, assetId: string, dto: CreateAnnotationDto) {
    const shareLink = await this.findByToken(token);

    const [asset] = await this.client
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, shareLink.projectId)));

    if (!asset) throw new NotFoundException('Asset not found in this project');

    return this.client.transaction(async (tx) => {
      const [newCollab] = await tx
        .insert(collaborations)
        .values({
          assetId,
          commentText: dto.commentText ?? null,
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
            boundingBox: dto.coordinates.boundingBox ?? null,
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
        coordinates: newCoords ? { id: newCoords.id, coordX: newCoords.coordX, coordY: newCoords.coordY, boundingBox: newCoords.boundingBox } : null,
        video: newVideo ? { id: newVideo.id, timestampSeconds: newVideo.timestampSeconds, duration: newVideo.duration } : null,
      };
    });
  }
}
