import { Test, TestingModule } from '@nestjs/testing';
import { McpService } from './mcp.service';
import { ProjectsService } from '../projects/projects.service';
import { OrdersService } from '../orders/orders.service';
import { AssetsService } from '../assets/assets.service';
import { ShareLinksService } from '../share-links/share-links.service';

const mockProjects = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  transition: jest.fn(),
};
const mockOrders = {
  createCheckoutFromShareToken: jest.fn(),
  findOne: jest.fn(),
};
const mockAssets = { findAll: jest.fn() };
const mockShareLinks = { create: jest.fn(), findByToken: jest.fn() };

describe('McpService', () => {
  let service: McpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        { provide: ProjectsService, useValue: mockProjects },
        { provide: OrdersService, useValue: mockOrders },
        { provide: AssetsService, useValue: mockAssets },
        { provide: ShareLinksService, useValue: mockShareLinks },
      ],
    }).compile();

    service = module.get<McpService>(McpService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('exposes handleRequest method', () => {
    expect(typeof service.handleRequest).toBe('function');
  });
});
