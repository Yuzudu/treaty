import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ProjectStatus } from '@treaty/shared';
import type { DrizzleDB } from '../db/db.module';
import type { ShareLinksService } from '../share-links/share-links.service';

interface MockPaymentProvider {
  createSubAccount: jest.Mock<
    Promise<{ subAccountId: string }>,
    [{ email: string; name: string }]
  >;
  getSubAccountStatus: jest.Mock<Promise<{ active: boolean }>, [string]>;
  createCheckoutSession: jest.Mock<
    Promise<{ url: string; externalId: string }>,
    [Record<string, unknown>]
  >;
  verifyWebhookToken: jest.Mock<boolean, [string]>;
}

interface Chain<T> extends Promise<T> {
  from(): Chain<T>;
  where(): Chain<T>;
  innerJoin(): Chain<T>;
  set(): Chain<T>;
  values(): Chain<T>;
  returning(): Promise<T>;
}

function makeChain<T>(value: T): Chain<T> {
  const chain = Promise.resolve(value) as Chain<T>;
  chain.from = () => makeChain(value);
  chain.where = () => makeChain(value);
  chain.innerJoin = () => makeChain(value);
  chain.set = () => makeChain(value);
  chain.values = () => makeChain(value);
  chain.returning = () => Promise.resolve(value);
  return chain;
}

const mockUser = {
  id: 'user-1',
  email: 'creator@example.com',
  name: 'Creator',
  paymentAccountId: null as string | null,
};
const mockProject = {
  id: 'proj-1',
  userId: 'user-1',
  title: 'Test Project',
  status: ProjectStatus.AWAITING_PAYMENT,
  priceCents: 50000,
  currency: 'PHP',
  createdAt: new Date(),
};

describe('OrdersService', () => {
  let service: OrdersService;
  let mockDb: { select: jest.Mock; insert: jest.Mock; update: jest.Mock };
  let mockPaymentProvider: MockPaymentProvider;
  let mockShareLinksService: jest.Mocked<ShareLinksService>;

  beforeEach(() => {
    mockDb = {
      select: jest.fn().mockReturnValue(makeChain([mockProject])),
      insert: jest.fn().mockReturnValue(makeChain([])),
      update: jest.fn().mockReturnValue(makeChain([])),
    };
    mockPaymentProvider = {
      createSubAccount: jest.fn<
        Promise<{ subAccountId: string }>,
        [{ email: string; name: string }]
      >(),
      getSubAccountStatus: jest.fn<Promise<{ active: boolean }>, [string]>(),
      createCheckoutSession: jest.fn<
        Promise<{ url: string; externalId: string }>,
        [Record<string, unknown>]
      >(),
      verifyWebhookToken: jest.fn<boolean, [string]>(),
    };
    mockShareLinksService = {
      create: jest.fn(),
      findByToken: jest
        .fn()
        .mockResolvedValue({ projectId: 'proj-1', token: 'tok' }),
    };

    service = new OrdersService(
      mockDb as unknown as DrizzleDB,
      mockPaymentProvider,
      mockShareLinksService,
    );
  });

  describe('onboardCreator', () => {
    it('creates a sub-account when none exists', async () => {
      mockDb.select.mockReturnValue(makeChain([mockUser]));
      mockPaymentProvider.createSubAccount.mockResolvedValue({
        subAccountId: 'acc_123',
      });

      const result = await service.onboardCreator('user-1');

      expect(result).toEqual({ subAccountId: 'acc_123' });
      expect(mockPaymentProvider.createSubAccount).toHaveBeenCalledWith({
        email: 'creator@example.com',
        name: 'Creator',
      });
    });

    it('returns the existing sub-account without calling the provider again', async () => {
      mockDb.select.mockReturnValue(
        makeChain([{ ...mockUser, paymentAccountId: 'acc_existing' }]),
      );

      const result = await service.onboardCreator('user-1');

      expect(result).toEqual({ subAccountId: 'acc_existing' });
      expect(mockPaymentProvider.createSubAccount).not.toHaveBeenCalled();
    });
  });

  describe('createCheckoutFromShareToken', () => {
    it('throws BadRequestException when project is not AWAITING_PAYMENT', async () => {
      mockDb.select.mockReturnValue(
        makeChain([{ ...mockProject, status: ProjectStatus.DRAFT }]),
      );

      await expect(service.createCheckoutFromShareToken('tok')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException when creator has no payment account', async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([mockProject]))
        .mockReturnValueOnce(makeChain([mockUser]));

      await expect(service.createCheckoutFromShareToken('tok')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a checkout session and writes a pending transaction', async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([mockProject]))
        .mockReturnValueOnce(
          makeChain([{ ...mockUser, paymentAccountId: 'acc_123' }]),
        );
      mockPaymentProvider.getSubAccountStatus.mockResolvedValue({
        active: true,
      });
      mockPaymentProvider.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.xendit.co/inv_1',
        externalId: 'inv_1',
      });

      const result = await service.createCheckoutFromShareToken('tok');

      expect(result).toEqual({ url: 'https://checkout.xendit.co/inv_1' });
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns NotFoundException when no order matches', async () => {
      mockDb.select.mockReturnValue(makeChain([]));

      await expect(service.findOne('user-1', 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
