import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { ProjectStatus, canTransition } from '@treaty/shared';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { projects } from '../../db/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { TransitionProjectDto } from './dto/transition-project.dto';

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null) {}

  private get client(): DrizzleDB {
    if (!this.db)
      throw new InternalServerErrorException('Database not available');
    return this.db;
  }

  async findAll(userId: string) {
    return this.client
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))
      .limit(100);
  }

  async findOne(userId: string, id: string) {
    const [project] = await this.client
      .select()
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
    return project;
  }

  async transition(userId: string, id: string, dto: TransitionProjectDto) {
    const project = await this.findOne(userId, id);

    if (!canTransition(project.status as ProjectStatus, dto.to)) {
      throw new BadRequestException(
        `Cannot transition from ${project.status} to ${dto.to}`,
      );
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
    return updated;
  }
}
