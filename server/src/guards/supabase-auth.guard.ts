import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

// Replace with real Supabase JWT verification via Supabase JWKS
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Dev shortcut: x-user-id header bypasses JWT verification
    const devUserId = request.headers['x-user-id'];
    if (devUserId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).userId = devUserId;
      this.logger.debug(`Dev auth: userId=${devUserId}`);
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}
