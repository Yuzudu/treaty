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
import { sharelinks, projects, assets } from '../../db/schema';

@Injectable()
export class ShareLinksService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async create(
    projectId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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

    if (!row) throw new NotFoundException('Share link not found');
    return { ...row, expiresAt: row.expiresAt.toISOString() };
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
}
