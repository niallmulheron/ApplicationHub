import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

describe('AppError', () => {
  it('creates an error with the correct statusCode and message', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.isOperational).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new AppError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('defaults isOperational to true', () => {
    const err = new AppError(500, 'Something broke');
    expect(err.isOperational).toBe(true);
  });

  it('accepts a custom isOperational flag', () => {
    const err = new AppError(500, 'Programmer error', false);
    expect(err.isOperational).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// errorHandler middleware
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('errorHandler', () => {
  const req = {} as Request;
  const next = vi.fn() as unknown as NextFunction;

  it('responds with the AppError statusCode and message', () => {
    const err = new AppError(422, 'Validation failed');
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed' });
  });

  it('responds 404 for a not-found AppError', () => {
    const err = new AppError(404, 'Application not found');
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Application not found' });
  });

  it('responds 500 for an unknown error in test/dev mode (exposes message)', () => {
    const err = new Error('Something unexpected');
    const res = makeRes();
    process.env.NODE_ENV = 'test';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      error: 'Something unexpected',
    });
  });

  it('hides the error message in production', () => {
    const err = new Error('Internal DB details');
    const res = makeRes();
    process.env.NODE_ENV = 'production';

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    process.env.NODE_ENV = 'test'; // restore
  });
});
