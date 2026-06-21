import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectStatus } from '@treaty/shared';
import type { DrizzleDB } from '../db/db.module';
import type { ShareLinksService } from '../share-links/share-links.service';

interface Chain<T> extends Promise<T> {
  from(): Chain<T>;
  where(): Chain<T>;
  orderBy(): { limit(): Promise<T> };
  set(): Chain<T>;
  values(): Chain<T>;
  returning(): Promise<T>;
}

function makeChain<T>(value: T): Chain<T> {
  const chain = Promise.resolve(value) as Chain<T>;
  chain.from = () => makeChain(value);
  chain.where = () => makeChain(value);
  chain.orderBy = () => ({ limit: () => Promise.resolve(value) });
  chain.set = () => makeChain(value);
  chain.values = () => makeChain(value);
  chain.returning = () => Promise.resolve(value);
  return chain;
}

const mockProject = {
  id: 'proj-1',
  userId: 'user-1',
  title: 'Test Project',
  status: ProjectStatus.DRAFT,
  createdAt: new Date(),
};

type MockDb = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDb: MockDb;
  let mockShareLinks: jest.Mocked<ShareLinksService>;

  beforeEach(() => {
    mockDb = {
      select: jest.fn().mockReturnValue(makeChain([mockProject])),
      insert: jest.fn().mockReturnValue(makeChain([mockProject])),
      update: jest.fn().mockReturnValue(makeChain([mockProject])),
    };
    mockShareLinks = {
      create: jest.fn().mockResolvedValue({ token: 'tok' }),
      revoke: jest.fn().mockResolvedValue(undefined),
      findByToken: jest
        .fn()
        .mockResolvedValue({ projectId: 'proj-1', token: 'tok' }),
      getActiveByProjectId: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ShareLinksService>;
    const mockOrdersService = {
      cancelPendingOrder: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProjectsService(
      mockDb as unknown as DrizzleDB,
      mockShareLinks,
      mockOrdersService as any,
    );
  });

  describe('findAll', () => {
    it('returns projects for the user', async () => {
      const result = await service.findAll('user-1');
      expect(result).toEqual([mockProject]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a project belonging to the user', async () => {
      const result = await service.findOne('user-1', 'proj-1');
      expect(result).toEqual(mockProject);
    });

    it('throws NotFoundException when project is not found', async () => {
      mockDb.select.mockReturnValue(makeChain([]));
      await expect(service.findOne('user-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('inserts a project and returns it', async () => {
      const result = await service.create('user-1', { title: 'New Project' });
      expect(result).toEqual(mockProject);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('transition', () => {
    it('transitions a project to a valid next status', async () => {
      const paid = { ...mockProject, status: ProjectStatus.PAID };
      mockDb.update.mockReturnValue(makeChain([paid]));
      const result = await service.transition('user-1', 'proj-1', {
        to: ProjectStatus.PREVIEW_SHARED,
      });
      expect(result).toEqual(paid);
    });

    it('throws BadRequestException for an invalid transition', async () => {
      await expect(
        service.transition('user-1', 'proj-1', { to: ProjectStatus.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists priceCents and currency when transitioning to AWAITING_PAYMENT', async () => {
      const previewShared = {
        ...mockProject,
        status: ProjectStatus.PREVIEW_SHARED,
      };
      const awaitingPayment = {
        ...mockProject,
        status: ProjectStatus.AWAITING_PAYMENT,
        priceCents: 50000,
        currency: 'PHP',
      };
      mockDb.select
        .mockReturnValueOnce(makeChain([previewShared]))
        .mockReturnValueOnce(makeChain([{ paymentAccountStatus: 'LIVE' }]));
      mockDb.update.mockReturnValue(makeChain([awaitingPayment]));

      const result = await service.transition('user-1', 'proj-1', {
        to: ProjectStatus.AWAITING_PAYMENT,
        priceCents: 50000,
        currency: 'PHP',
      });

      expect(result).toEqual(awaitingPayment);
    });
  });
});
