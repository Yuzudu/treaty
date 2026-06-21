import { UnauthorizedException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ProjectStatus } from '@treaty/shared';
import type { DrizzleDB } from '../db/db.module';
import type { PaymentProvider } from '../../providers/payment.provider';
import type { ShareLinksService } from '../share-links/share-links.service';

interface SelectChain<T> extends Promise<T> {
  from(): SelectChain<T>;
  where(): Promise<T>;
}

function makeSelectChain<T>(value: T): SelectChain<T> {
  const chain = Promise.resolve(value) as SelectChain<T>;
  chain.from = () => makeSelectChain(value);
  chain.where = () => Promise.resolve(value);
  return chain;
}

interface UpdateChain {
  set(values: unknown): UpdateChain;
  where(): Promise<unknown[]>;
}

describe('WebhooksService', () => {
  let service: WebhooksService;
  let mockDb: { select: jest.Mock; update: jest.Mock; transaction: jest.Mock };
  let mockPaymentProvider: { verifyWebhookToken: jest.Mock<boolean, [string]> };
  let mockShareLinks: Pick<ShareLinksService, 'revoke'>;
  let txUpdateCalls: unknown[];

  function makeUpdateChain() {
    const chain: { set: jest.Mock; where: jest.Mock } = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    };
    return chain;
  }

  beforeEach(() => {
    txUpdateCalls = [];
    mockDb = {
      select: jest.fn(),
      update: jest.fn(() => makeUpdateChain()),
      transaction: jest.fn(
        async (cb: (tx: { update: jest.Mock }) => Promise<void>) => {
          const tx = {
            update: jest.fn((): UpdateChain => {
              const chain: UpdateChain = {
                set: (values: unknown) => {
                  txUpdateCalls.push(values);
                  return chain;
                },
                where: () => Promise.resolve([]),
              };
              return chain;
            }),
          };
          return cb(tx);
        },
      ),
    };
    mockPaymentProvider = {
      verifyWebhookToken: jest.fn<boolean, [string]>(),
    };
    mockShareLinks = { revoke: jest.fn().mockResolvedValue(undefined) };
    const mockConfigService = { get: jest.fn().mockReturnValue(30) };
    service = new WebhooksService(
      mockDb as unknown as DrizzleDB,
      mockPaymentProvider as unknown as PaymentProvider,
      mockShareLinks as unknown as ShareLinksService,
      mockConfigService as any,
    );
  });

  it('throws UnauthorizedException when token is invalid', async () => {
    mockPaymentProvider.verifyWebhookToken.mockReturnValue(false);

    await expect(
      service.handleXenditEvent(
        { external_id: 'inv_1', status: 'PAID' },
        'bad-token',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('EXPIRED event clears the PENDING transaction row', async () => {
    mockPaymentProvider.verifyWebhookToken.mockReturnValue(true);

    await service.handleXenditEvent(
      { external_id: 'inv_1', status: 'EXPIRED' },
      'tok',
    );

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('ignores events that are neither PAID nor EXPIRED', async () => {
    mockPaymentProvider.verifyWebhookToken.mockReturnValue(true);

    await service.handleXenditEvent(
      { external_id: 'inv_1', status: 'PENDING' },
      'tok',
    );

    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('resolves silently when no transaction matches the external id', async () => {
    mockPaymentProvider.verifyWebhookToken.mockReturnValue(true);
    mockDb.select.mockReturnValue(makeSelectChain([]));

    await expect(
      service.handleXenditEvent(
        { external_id: 'inv_unknown', status: 'PAID' },
        'tok',
      ),
    ).resolves.toBeUndefined();
  });

  it('no-ops when the transaction is already PAID (idempotent retry)', async () => {
    mockPaymentProvider.verifyWebhookToken.mockReturnValue(true);
    mockDb.select.mockReturnValue(
      makeSelectChain([
        { projectId: 'proj-1', paymentIntentId: 'inv_1', payoutStatus: 'PAID' },
      ]),
    );

    await service.handleXenditEvent(
      { external_id: 'inv_1', status: 'PAID' },
      'tok',
    );

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('marks project PAID and transaction PAID inside one DB transaction', async () => {
    mockPaymentProvider.verifyWebhookToken.mockReturnValue(true);
    mockDb.select.mockReturnValue(
      makeSelectChain([
        {
          projectId: 'proj-1',
          paymentIntentId: 'inv_1',
          payoutStatus: 'PENDING',
        },
      ]),
    );

    await service.handleXenditEvent(
      { external_id: 'inv_1', status: 'PAID' },
      'tok',
    );

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(txUpdateCalls).toEqual([
      { status: ProjectStatus.PAID },
      { expiresAt: expect.any(Date) },
      { payoutStatus: 'PAID' },
    ]);
  });
});
