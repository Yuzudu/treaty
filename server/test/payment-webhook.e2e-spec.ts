/**
 * E2E: payment webhook → project flips PAID
 *
 * Requires DATABASE_URL and XENDIT_WEBHOOK_TOKEN set in env.
 * Run: pnpm test:e2e --testPathPattern=payment-webhook
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DRIZZLE_DB, type DrizzleDB } from '../src/modules/db/db.module';
import { projects, transactions, users } from '../src/db/schema';
import { ProjectStatus } from '@treaty/shared';

// Allow test to define its own token if env var not set
process.env.XENDIT_WEBHOOK_TOKEN ??= 'e2e-test-token';
process.env.XENDIT_SECRET_KEY ??= 'xnd_development_test';
process.env.WEB_URL ??= 'http://localhost:3000';

const WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;

describe('Payment webhook (e2e)', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;

  const testUserId = crypto.randomUUID();
  const testProjectId = crypto.randomUUID();
  const testPaymentIntentId = `inv_e2e_${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    db = moduleFixture.get<DrizzleDB>(DRIZZLE_DB);
    if (!db) throw new Error('DATABASE_URL must be set for e2e tests');

    await db.insert(users).values({
      id: testUserId,
      email: `e2e-${Date.now()}@treaty.test`,
      name: 'E2E Creator',
      paymentAccountId: 'acc_e2e',
      paymentAccountStatus: 'LIVE',
    });

    await db.insert(projects).values({
      id: testProjectId,
      userId: testUserId,
      title: 'E2E Test Project',
      status: ProjectStatus.AWAITING_PAYMENT,
      priceCents: 50000,
      currency: 'PHP',
    });

    await db.insert(transactions).values({
      projectId: testProjectId,
      paymentIntentId: testPaymentIntentId,
      amountTotal: '500.00',
      platformFee: '5.00',
      payoutStatus: 'PENDING',
    });
  });

  afterAll(async () => {
    if (db) {
      await db
        .delete(transactions)
        .where(eq(transactions.projectId, testProjectId));
      await db.delete(projects).where(eq(projects.id, testProjectId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await app?.close();
  });

  it('rejects invalid x-callback-token with 401', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/xendit')
      .set('x-callback-token', 'wrong-token')
      .send({ external_id: testPaymentIntentId, status: 'PAID' })
      .expect(401);
  });

  it('ignores non-PAID status — project stays AWAITING_PAYMENT', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/xendit')
      .set('x-callback-token', WEBHOOK_TOKEN)
      .send({ external_id: testPaymentIntentId, status: 'EXPIRED' })
      .expect(201);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));
    expect(project.status).toBe(ProjectStatus.AWAITING_PAYMENT);
  });

  it('PAID webhook flips project → PAID and transaction → PAID', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/xendit')
      .set('x-callback-token', WEBHOOK_TOKEN)
      .send({ external_id: testPaymentIntentId, status: 'PAID' })
      .expect(201);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));
    expect(project.status).toBe(ProjectStatus.PAID);

    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.paymentIntentId, testPaymentIntentId));
    expect(tx.payoutStatus).toBe('PAID');
  });

  it('duplicate PAID webhook is idempotent — no error', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/xendit')
      .set('x-callback-token', WEBHOOK_TOKEN)
      .send({ external_id: testPaymentIntentId, status: 'PAID' })
      .expect(201);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, testProjectId));
    expect(project.status).toBe(ProjectStatus.PAID);
  });

  it('EXPIRED webhook clears PENDING so a second buyer can checkout', async () => {
    const expiredIntentId = `inv_e2e_expire_${Date.now()}`;
    await db.insert(transactions).values({
      projectId: testProjectId,
      paymentIntentId: expiredIntentId,
      amountTotal: '500.00',
      platformFee: '5.00',
      payoutStatus: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/webhooks/xendit')
      .set('x-callback-token', WEBHOOK_TOKEN)
      .send({ external_id: expiredIntentId, status: 'EXPIRED' })
      .expect(201);

    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.paymentIntentId, expiredIntentId));
    expect(tx.payoutStatus).toBe('EXPIRED');

    await db
      .delete(transactions)
      .where(eq(transactions.paymentIntentId, expiredIntentId));
  });

  it('unknown paymentIntentId returns 201 silently', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/xendit')
      .set('x-callback-token', WEBHOOK_TOKEN)
      .send({ external_id: 'inv_does_not_exist', status: 'PAID' })
      .expect(201);
  });
});
