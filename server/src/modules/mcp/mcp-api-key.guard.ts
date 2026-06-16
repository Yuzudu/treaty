import {
  CanActivate,
  ExecutionContext,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class McpApiKeyGuard implements CanActivate, OnModuleInit {
  onModuleInit(): void {
    if (!process.env.MCP_API_KEY) {
      throw new Error(
        'MCP_API_KEY environment variable must be set to use the MCP server',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const key = req.headers['x-api-key'];
    const expected = process.env.MCP_API_KEY!;

    if (!key || key.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  }
}
