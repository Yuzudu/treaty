import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ProjectStatus, canTransition } from '@treaty/shared';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { projects, assets, users } from '../../db/schema';
import { ShareLinksService } from '../share-links/share-links.service';
import { OrdersService } from '../orders/orders.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { TransitionProjectDto } from './dto/transition-project.dto';

const projectSelect = {
  id: projects.id,
  userId: projects.userId,
  title: projects.title,
  status: projects.status,
  priceCents: projects.priceCents,
  currency: projects.currency,
  createdAt: projects.createdAt,
  shareToken: sql<string | null>`(
    SELECT token FROM share_links
    WHERE project_id = projects.projectid AND status = 'ACTIVE'
    LIMIT 1
  )`.as('shareToken'),
  thumbnailUrl: sql<string | null>`(
    SELECT watermarkedurl FROM assets
    WHERE projectid = projects.projectid
    LIMIT 1
  )`.as('thumbnailUrl'),
};

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    private readonly shareLinksService: ShareLinksService,
    private readonly ordersService: OrdersService,
  ) {}

  private get client(): DrizzleDB {
    if (!this.db)
      throw new InternalServerErrorException('Database not available');
    return this.db;
  }

  async findAll(userId: string) {
    return this.client
      .select(projectSelect)
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))
      .limit(100);
  }

  async findOne(userId: string, id: string) {
    const [project] = await this.client
      .select(projectSelect)
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));

    if (!project) throw new NotFoundException(`Project not found`);
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const [project] = await this.client
      .insert(projects)
      .values({ title: dto.title, userId, status: ProjectStatus.DRAFT })
      .returning();
    return { ...project, shareToken: null, thumbnailUrl: null };
  }

  async transition(userId: string, id: string, dto: TransitionProjectDto) {
    const project = await this.findOne(userId, id);

    if (!canTransition(project.status as ProjectStatus, dto.to)) {
      throw new BadRequestException(
        `Cannot transition from ${project.status} to ${dto.to}`,
      );
    }

    let shareToken: string | undefined;

    // Reprice: cancel the in-flight invoice before returning to PREVIEW_SHARED
    if (
      (project.status as ProjectStatus) === ProjectStatus.AWAITING_PAYMENT &&
      dto.to === ProjectStatus.PREVIEW_SHARED
    ) {
      await this.ordersService.cancelPendingOrder(id);
    }

    if (dto.to === ProjectStatus.PREVIEW_SHARED) {
      const [{ count }] = await this.client
        .select({ count: sql<number>`count(*)::int` })
        .from(assets)
        .where(eq(assets.projectId, id));
      if (count === 0) {
        throw new BadRequestException(
          'Add at least one file before sharing with client',
        );
      }
      // Revoke any existing link first (handles fresh share + revival)
      await this.shareLinksService.revoke(id);
      shareToken = (await this.shareLinksService.create(id)).token;
      // Clear download expiry so revived projects don't inherit old delivery window
      await this.client
        .update(assets)
        .set({ expiresAt: null })
        .where(eq(assets.projectId, id));
    }

    if (dto.to === ProjectStatus.DRAFT || dto.to === ProjectStatus.EXPIRED) {
      await this.shareLinksService.revoke(id);
    }

    if (dto.to === ProjectStatus.AWAITING_PAYMENT) {
      if (!dto.priceCents || dto.priceCents <= 0) {
        throw new BadRequestException(
          'Price is required and must be greater than 0.',
        );
      }

      const [creator] = await this.client
        .select({ paymentAccountStatus: users.paymentAccountStatus })
        .from(users)
        .where(eq(users.id, project.userId));

      if (creator?.paymentAccountStatus !== 'LIVE') {
        if (!creator?.paymentAccountStatus) {
          throw new BadRequestException(
            'Connect your payout account in Settings before accepting payments.',
          );
        }
        throw new BadRequestException(
          'Your payout account is still being verified. This usually takes 3–5 business days.',
        );
      }
    }

    const updateValues: Partial<typeof projects.$inferInsert> = {
      status: dto.to,
    };
    if (dto.to === ProjectStatus.AWAITING_PAYMENT) {
      updateValues.priceCents = dto.priceCents;
      updateValues.currency = dto.currency ?? 'PHP';
    }

    const [updated] = await this.client
      .update(projects)
      .set(updateValues)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          eq(projects.status, project.status),
        ),
      )
      .returning();

    if (!updated) {
      throw new ConflictException('Project status changed concurrently, retry');
    }

    return {
      ...updated,
      shareToken: shareToken ?? null,
      thumbnailUrl: project.thumbnailUrl,
    };
  }
}
