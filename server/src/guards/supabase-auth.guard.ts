import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly jwtSecret: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    if (!process.env.SUPABASE_JWT_SECRET) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is not set');
    }
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }
    this.jwtSecret = process.env.SUPABASE_JWT_SECRET;
    this.jwks = createRemoteJWKSet(
      new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    const header = jwt.decode(token, { complete: true })?.header;

    try {
      let sub: string | undefined;

      if (header?.alg === 'HS256') {
        const payload = jwt.verify(token, this.jwtSecret, {
          algorithms: ['HS256'],
        }) as jwt.JwtPayload;
        sub = payload.sub;
      } else {
        const { payload } = await jwtVerify(token, this.jwks, {
          issuer: `${process.env.SUPABASE_URL}/auth/v1`,
          audience: 'authenticated',
        });
        sub = payload.sub;
      }

      if (!sub) throw new UnauthorizedException('Token missing subject claim');
      request.userId = sub;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
