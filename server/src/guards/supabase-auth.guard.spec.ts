import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { SupabaseAuthGuard } from './supabase-auth.guard';

jest.mock('jsonwebtoken');

const mockVerify = jwt.verify as jest.Mock;

function makeContext(headers: Record<string, string | undefined>) {
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    guard = new SupabaseAuthGuard();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('JWT verification', () => {
    it('sets userId from verified token sub claim', () => {
      mockVerify.mockReturnValueOnce({ sub: 'user-abc-123' });
      const request: any = {
        headers: { authorization: 'Bearer valid.jwt.token' },
      };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.userId).toBe('user-abc-123');
      expect(mockVerify).toHaveBeenCalledWith(
        'valid.jwt.token',
        process.env.SUPABASE_JWT_SECRET,
        { algorithms: ['HS256'] },
      );
    });

    it('throws UnauthorizedException when token has no sub claim', () => {
      mockVerify.mockReturnValueOnce({ email: 'user@example.com' }); // no sub
      const ctx = makeContext({ authorization: 'Bearer no.sub.token' });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is invalid', () => {
      mockVerify.mockImplementationOnce(() => {
        throw new Error('invalid signature');
      });
      const ctx = makeContext({ authorization: 'Bearer bad.token' });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authorization header is missing', () => {
      const ctx = makeContext({});

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authorization header has wrong format', () => {
      const ctx = makeContext({ authorization: 'Basic dXNlcjpwYXNz' });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe('dev bypass', () => {
    it('allows x-user-id bypass in development', () => {
      process.env.NODE_ENV = 'development';
      const request: any = { headers: { 'x-user-id': 'dev-user-123' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.userId).toBe('dev-user-123');
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('ignores x-user-id bypass in production', () => {
      process.env.NODE_ENV = 'production';
      mockVerify.mockImplementationOnce(() => {
        throw new Error('no token');
      });
      const ctx = makeContext({ 'x-user-id': 'attacker-id', authorization: 'Bearer bad.token' });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(mockVerify).toHaveBeenCalled();
    });
  });
});
