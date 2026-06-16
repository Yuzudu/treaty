import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { ProjectStatus } from '@treaty/shared';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { projects, transactions } from '../../db/schema';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../../providers/payment.provider';

export interface XenditWebhookPayload {
  external_id: string;
  status: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
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
      throw new NotFoundException('Transaction not found');
    }

    if (existing.payoutStatus === 'PAID') {
      return;
    }

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
        .update(transactions)
        .set({ payoutStatus: 'PAID' })
        .where(eq(transactions.paymentIntentId, payload.external_id));
    });
  }
}
