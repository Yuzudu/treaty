import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly jwtSecret: string;

  constructor() {
    if (!process.env.SUPABASE_JWT_SECRET) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is not set');
    }
    this.jwtSecret = process.env.SUPABASE_JWT_SECRET;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Dev bypass — unreachable in production
    if (process.env.NODE_ENV !== 'production') {
      const devUserId = request.headers['x-user-id'] as string | undefined;
      if (devUserId) {
        request.userId = devUserId;
        this.logger.debug(`Dev auth: userId=${devUserId}`);
        return true;
      }
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Token missing subject claim');
      }

      request.userId = payload.sub;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
