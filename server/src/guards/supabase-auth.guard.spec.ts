import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { SupabaseAuthGuard } from './supabase-auth.guard';

jest.mock('jsonwebtoken');
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

import { jwtVerify } from 'jose';

const mockVerify = jwt.verify as jest.Mock;
const mockDecode = jwt.decode as jest.Mock;
const mockJwtVerify = jwtVerify as jest.Mock;

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
    process.env.SUPABASE_URL = 'https://test.supabase.co';
  });

  beforeEach(() => {
    guard = new SupabaseAuthGuard();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('JWT verification — HS256 (legacy)', () => {
    beforeEach(() => {
      mockDecode.mockReturnValue({ header: { alg: 'HS256' }, payload: {}, signature: '' });
    });

    it('sets userId from verified token sub claim', async () => {
      mockVerify.mockReturnValueOnce({ sub: 'user-abc-123' });
      const request: any = { headers: { authorization: 'Bearer valid.jwt.token' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.userId).toBe('user-abc-123');
      expect(mockVerify).toHaveBeenCalledWith('valid.jwt.token', 'test-secret', { algorithms: ['HS256'] });
    });

    it('throws UnauthorizedException when token has no sub claim', async () => {
      mockVerify.mockReturnValueOnce({ email: 'user@example.com' });
      const ctx = makeContext({ authorization: 'Bearer no.sub.token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is invalid', async () => {
      mockVerify.mockImplementationOnce(() => { throw new Error('invalid signature') });
      const ctx = makeContext({ authorization: 'Bearer bad.token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT verification — ES256 (current)', () => {
    beforeEach(() => {
      mockDecode.mockReturnValue({ header: { alg: 'ES256' }, payload: {}, signature: '' });
    });

    it('sets userId from ES256 verified token sub claim', async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-es256-123' } });
      const request: any = { headers: { authorization: 'Bearer valid.es256.token' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.userId).toBe('user-es256-123');
    });

    it('throws UnauthorizedException when ES256 token is invalid', async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error('invalid signature'));
      const ctx = makeContext({ authorization: 'Bearer bad.es256.token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('header validation', () => {
    it('throws UnauthorizedException when authorization header is missing', async () => {
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authorization header has wrong format', async () => {
      const ctx = makeContext({ authorization: 'Basic dXNlcjpwYXNz' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('dev bypass', () => {
    it('allows x-user-id bypass in development', async () => {
      process.env.NODE_ENV = 'development';
      const request: any = { headers: { 'x-user-id': 'dev-user-123' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.userId).toBe('dev-user-123');
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('ignores x-user-id bypass in production', async () => {
      process.env.NODE_ENV = 'production';
      mockDecode.mockReturnValue({ header: { alg: 'ES256' }, payload: {}, signature: '' });
      mockJwtVerify.mockRejectedValueOnce(new Error('no token'));
      const ctx = makeContext({ 'x-user-id': 'attacker-id', authorization: 'Bearer bad.token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      expect(mockVerify).not.toHaveBeenCalled();
    });
  });
});
