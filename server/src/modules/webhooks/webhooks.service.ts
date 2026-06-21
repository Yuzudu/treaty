import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { ProjectStatus } from '@treaty/shared';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { projects, transactions, assets, users } from '../../db/schema';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../../providers/payment.provider';
import { ShareLinksService } from '../share-links/share-links.service';

export interface XenditWebhookPayload {
  external_id: string;
  status: string;
}

export interface XenditAccountWebhookPayload {
  id: string;
  status: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly shareLinksService: ShareLinksService,
    private readonly configService: ConfigService,
  ) {}

  private get client(): DrizzleDB {
    if (!this.db)
      throw new InternalServerErrorException('Database not available');
    return this.db;
  }

  async handleXenditEvent(
    payload: XenditWebhookPayload,
    token: string,
  ): Promise<void> {
    if (!this.paymentProvider.verifyWebhookToken(token)) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    if (payload.status === 'EXPIRED') {
      await this.handleExpired(payload.external_id);
      return;
    }

    if (payload.status !== 'PAID') {
      this.logger.log(`Ignoring Xendit event with status ${payload.status}`);
      return;
    }

    const [existing] = await this.client
      .select()
      .from(transactions)
      .where(eq(transactions.paymentIntentId, payload.external_id));

    if (!existing) {
      this.logger.warn(
        `Webhook for unknown paymentIntentId=${payload.external_id}`,
      );
      return;
    }

    if (existing.payoutStatus === 'PAID' || existing.payoutStatus === 'CANCELLED') {
      return;
    }

    const [project] = await this.client
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.id, existing.projectId!));

    if (!project || project.status !== ProjectStatus.AWAITING_PAYMENT) {
      this.logger.warn(
        `Late PAID webhook for paymentIntentId=${payload.external_id}; project is in ${project?.status ?? 'unknown'} — skipping`,
      );
      return;
    }

    const retentionDays = this.configService.get<number>('RETENTION_DAYS', 30);
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    await this.client.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ status: ProjectStatus.PAID })
        .where(
          and(
            eq(projects.id, existing.projectId!),
            eq(projects.status, ProjectStatus.AWAITING_PAYMENT),
          ),
        );

      await tx
        .update(assets)
        .set({ expiresAt })
        .where(eq(assets.projectId, existing.projectId!));

      await tx
        .update(transactions)
        .set({ payoutStatus: 'PAID' })
        .where(eq(transactions.paymentIntentId, payload.external_id));
    });
  }

  async handleXenditAccountEvent(
    payload: XenditAccountWebhookPayload,
    token: string,
  ): Promise<void> {
    if (!this.paymentProvider.verifyWebhookToken(token)) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    const validStatuses = new Set([
      'INVITED',
      'REGISTERED',
      'AWAITING_DOCS',
      'PENDING_VERIFICATION',
      'LIVE',
      'SUSPENDED',
    ]);

    if (!validStatuses.has(payload.status)) {
      this.logger.log(
        `Ignoring unknown account status ${payload.status} for sub-account ${payload.id}`,
      );
      return;
    }

    await this.client
      .update(users)
      .set({ paymentAccountStatus: payload.status })
      .where(eq(users.paymentAccountId, payload.id));

    this.logger.log(
      `Sub-account ${payload.id} status updated to ${payload.status}`,
    );
  }

  private async handleExpired(externalId: string): Promise<void> {
    const [existing] = await this.client
      .select()
      .from(transactions)
      .where(eq(transactions.paymentIntentId, externalId));

    if (!existing) {
      this.logger.warn(`EXPIRED webhook for unknown paymentIntentId=${externalId}`);
      return;
    }

    if (existing.payoutStatus !== 'PENDING') {
      return;
    }

    await this.client.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ status: ProjectStatus.EXPIRED })
        .where(
          and(
            eq(projects.id, existing.projectId!),
            eq(projects.status, ProjectStatus.AWAITING_PAYMENT),
          ),
        );

      await tx
        .update(transactions)
        .set({ payoutStatus: 'EXPIRED' })
        .where(eq(transactions.paymentIntentId, externalId));
    });

    await this.shareLinksService.revoke(existing.projectId!);
  }
}
