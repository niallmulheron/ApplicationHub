import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock the database BEFORE importing routes that depend on it
vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

import { query } from '../db/index.js';
import { authRoutes } from '../routes/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

const mockQuery = vi.mocked(query);

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when fields are missing', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'a@b.com' }); // missing password and name

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 409 when the email is already registered', async () => {
    // First query (check for existing user) returns a row
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] } as any);

    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'taken@example.com', password: 'password123', name: 'Niall' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 201 with user and JWT token on success', async () => {
    const newUser = {
      id: 'new-user-id',
      email: 'niall@example.com',
      name: 'Niall',
      created_at: new Date().toISOString(),
    };

    // Query 1: check existing (no rows) → Query 2: insert user → Query 3: insert profile
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any)          // no existing user
      .mockResolvedValueOnce({ rows: [newUser] } as any)   // INSERT user RETURNING
      .mockResolvedValueOnce({ rows: [] } as any);          // INSERT profile

    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'niall@example.com', password: 'password123', name: 'Niall' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'niall@example.com', name: 'Niall' });
    expect(res.body.token).toBeTruthy();

    // Verify the token is a valid JWT
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET as string) as any;
    expect(decoded.userId).toBe('new-user-id');
    expect(decoded.email).toBe('niall@example.com');
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when fields are missing', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'a@b.com' }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 401 when the email is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('returns 401 when the password is wrong', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-id', email: 'niall@example.com', name: 'Niall', password_hash: passwordHash }],
    } as any);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'niall@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('returns 200 with user and JWT token on success', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-id', email: 'niall@example.com', name: 'Niall', password_hash: passwordHash }],
    } as any);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'niall@example.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'user-id', email: 'niall@example.com' });
    expect(res.body.token).toBeTruthy();

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET as string) as any;
    expect(decoded.userId).toBe('user-id');
  });
});
