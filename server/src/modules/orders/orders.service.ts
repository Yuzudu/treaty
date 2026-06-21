import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq, and, or } from 'drizzle-orm';
import { ProjectStatus } from '@treaty/shared';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { projects, users, transactions } from '../../db/schema';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../../providers/payment.provider';
import { ShareLinksService } from '../share-links/share-links.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly shareLinksService: ShareLinksService,
  ) {}

  private get client(): DrizzleDB {
    if (!this.db)
      throw new InternalServerErrorException('Database not available');
    return this.db;
  }

  async onboardCreator(userId: string): Promise<{ subAccountId: string }> {
    const [user] = await this.client
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');

    if (user.paymentAccountId) {
      return { subAccountId: user.paymentAccountId };
    }

    const { subAccountId } = await this.paymentProvider.createSubAccount({
      email: user.email,
      name: user.name ?? user.email,
    });
    await this.client
      .update(users)
      .set({ paymentAccountId: subAccountId, paymentAccountStatus: 'INVITED' })
      .where(eq(users.id, userId));
    return { subAccountId };
  }

  async getOnboardingStatus(
    userId: string,
  ): Promise<{ onboarded: boolean; active: boolean; status: string | null }> {
    const [user] = await this.client
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user?.paymentAccountId)
      return { onboarded: false, active: false, status: null };

    return {
      onboarded: true,
      active: user.paymentAccountStatus === 'LIVE',
      status: user.paymentAccountStatus as string | null,
    };
  }

  async createCheckoutFromShareToken(token: string): Promise<{ url: string }> {
    const { projectId } = await this.shareLinksService.findByToken(token);

    const [project] = await this.client
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) throw new NotFoundException('Project not found');
    if ((project.status as ProjectStatus) !== ProjectStatus.AWAITING_PAYMENT) {
      throw new BadRequestException('Project is not awaiting payment');
    }
    if (!project.priceCents) {
      throw new BadRequestException('Project has no price set');
    }

    const [creator] = await this.client
      .select()
      .from(users)
      .where(eq(users.id, project.userId!));
    if (!creator?.paymentAccountId) {
      throw new ConflictException(
        'Creator has not completed payment onboarding',
      );
    }
    if (creator.paymentAccountStatus !== 'LIVE') {
      throw new BadRequestException('Creator payment account is not active.');
    }

    const parsedFeePercent = Number(process.env.PLATFORM_FEE_PERCENT);
    const feePercent = Number.isFinite(parsedFeePercent) ? parsedFeePercent : 1;
    const amountCents = project.priceCents;
    const platformFeeCents = Math.round((amountCents * feePercent) / 100);

    const session = await this.paymentProvider.createCheckoutSession({
      projectId: project.id,
      token,
      subAccountId: creator.paymentAccountId,
      amountCents,
      currency: project.currency ?? 'PHP',
      platformFeeCents,
    });

    try {
      await this.client.insert(transactions).values({
        projectId: project.id,
        paymentIntentId: session.externalId,
        amountTotal: (amountCents / 100).toFixed(2),
        platformFee: (platformFeeCents / 100).toFixed(2),
        payoutStatus: 'PENDING',
      });
    } catch (err) {
      // Unique constraint on (projectId) WHERE payoutStatus = 'PENDING'
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(
          'Payment already initiated for this project',
        );
      }
      throw err;
    }

    return { url: session.url };
  }

  async cancelPendingOrder(projectId: string): Promise<void> {
    const [completed] = await this.client
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.projectId, projectId),
          or(
            eq(transactions.payoutStatus, 'PAID'),
            eq(transactions.payoutStatus, 'DELIVERED'),
          ),
        ),
      );

    if (completed) {
      throw new BadRequestException('Cannot cancel a completed transaction.');
    }

    const [pending] = await this.client
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.projectId, projectId),
          eq(transactions.payoutStatus, 'PENDING'),
        ),
      );

    if (!pending) return;

    try {
      await this.paymentProvider.expireInvoice(pending.paymentIntentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not expire Xendit invoice ${pending.paymentIntentId}: ${message}`,
      );
    }

    await this.client
      .update(transactions)
      .set({ payoutStatus: 'CANCELLED' })
      .where(eq(transactions.id, pending.id));
  }

  async findOne(userId: string, id: string) {
    const [order] = await this.client
      .select()
      .from(transactions)
      .innerJoin(projects, eq(transactions.projectId, projects.id))
      .where(and(eq(transactions.id, id), eq(projects.userId, userId)));

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
