import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectStatus } from '@treaty/shared';

function makeChain(value: unknown = []) {
  const p = Promise.resolve(value) as any;
  p.from = () => makeChain(value);
  p.where = () => makeChain(value);
  p.orderBy = () => Promise.resolve(value);
  p.set = () => makeChain(value);
  p.values = () => makeChain(value);
  p.returning = () => Promise.resolve(value);
  return p;
}

const mockProject = {
  id: 'proj-1',
  userId: 'user-1',
  title: 'Test Project',
  status: ProjectStatus.DRAFT,
  createdAt: new Date(),
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn().mockReturnValue(makeChain([mockProject])),
      insert: jest.fn().mockReturnValue(makeChain([mockProject])),
      update: jest.fn().mockReturnValue(makeChain([mockProject])),
    };
    service = new ProjectsService(mockDb);
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
  });
});
