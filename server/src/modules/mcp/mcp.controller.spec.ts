import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpApiKeyGuard } from './mcp-api-key.guard';

const mockMcpService = { handleRequest: jest.fn() };

describe('McpController', () => {
  let controller: McpController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        { provide: McpService, useValue: mockMcpService },
        McpApiKeyGuard,
      ],
    })
      .overrideGuard(McpApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<McpController>(McpController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('post() delegates to McpService.handleRequest', async () => {
    const req = {} as any;
    const res = {} as any;
    const body = {};
    await controller.post(req, res, body);
    expect(mockMcpService.handleRequest).toHaveBeenCalledWith(req, res, body);
  });

  it('get() delegates to McpService.handleRequest', async () => {
    const req = {} as any;
    const res = {} as any;
    await controller.get(req, res);
    expect(mockMcpService.handleRequest).toHaveBeenCalledWith(req, res, undefined);
  });

  it('delete() delegates to McpService.handleRequest', async () => {
    const req = {} as any;
    const res = {} as any;
    await controller.delete(req, res);
    expect(mockMcpService.handleRequest).toHaveBeenCalledWith(req, res, undefined);
  });
});
