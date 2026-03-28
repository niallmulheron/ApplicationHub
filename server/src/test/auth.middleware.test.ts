import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// authenticate middleware
// ---------------------------------------------------------------------------

function makeReq(authHeader?: string): Request {
  return {
    headers: {
      authorization: authHeader,
    },
  } as unknown as Request;
}

describe('authenticate middleware', () => {
  const res = {} as Response;
  let next: NextFunction & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
  });

  it('throws 401 when Authorization header is missing', () => {
    const req = makeReq(undefined);
    expect(() => authenticate(req, res, next)).toThrow(AppError);
    expect(() => authenticate(req, res, next)).toThrow('Authentication required');
  });

  it('throws 401 when Authorization header is not a Bearer token', () => {
    const req = makeReq('Basic somebase64==');
    expect(() => authenticate(req, res, next)).toThrow('Authentication required');
  });

  it('throws 401 when the JWT is invalid', () => {
    const req = makeReq('Bearer not.a.valid.token');
    expect(() => authenticate(req, res, next)).toThrow('Invalid or expired token');
  });

  it('throws 401 when the JWT is signed with the wrong secret', () => {
    const token = jwt.sign({ userId: 'abc', email: 'a@b.com' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    expect(() => authenticate(req, res, next)).toThrow('Invalid or expired token');
  });

  it('throws 401 when the JWT is expired', () => {
    const token = jwt.sign(
      { userId: 'abc', email: 'a@b.com' },
      process.env.JWT_SECRET as string,
      { expiresIn: -1 as number }, // already expired
    );
    const req = makeReq(`Bearer ${token}`);
    expect(() => authenticate(req, res, next)).toThrow('Invalid or expired token');
  });

  it('sets req.user and calls next() with a valid token', () => {
    const payload = { userId: 'user-123', email: 'niall@example.com' };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' as string & jwt.SignOptions['expiresIn'] });
    const req = makeReq(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(req.user).toMatchObject(payload);
  });
});
