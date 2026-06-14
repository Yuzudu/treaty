import { ExecutionContext } from '@nestjs/common';
import { McpApiKeyGuard } from './mcp-api-key.guard';

const makeContext = (apiKey?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      }),
    }),
  }) as unknown as ExecutionContext;

describe('McpApiKeyGuard', () => {
  let guard: McpApiKeyGuard;

  beforeEach(() => {
    guard = new McpApiKeyGuard();
    process.env.MCP_API_KEY = 'test-secret';
  });

  afterEach(() => {
    delete process.env.MCP_API_KEY;
  });

  it('allows a request with the correct key', () => {
    expect(guard.canActivate(makeContext('test-secret'))).toBe(true);
  });

  it('rejects a request with the wrong key', () => {
    expect(guard.canActivate(makeContext('wrong'))).toBe(false);
  });

  it('rejects a request with no key', () => {
    expect(guard.canActivate(makeContext())).toBe(false);
  });
});
