import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock the database BEFORE importing routes
vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

import { query } from '../db/index.js';
import { applicationRoutes } from '../routes/applications.js';
import { errorHandler } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/applications', applicationRoutes);
  app.use(errorHandler);
  return app;
}

function makeAuthHeader(userId = 'user-123', email = 'niall@example.com') {
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

const mockQuery = vi.mocked(query);

const mockApplication = {
  id: 'app-1',
  user_id: 'user-123',
  company_id: 'company-1',
  role_title: 'Senior Engineer',
  status: 'applied',
  date_applied: '2026-03-01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  company_name: 'Acme Corp',
  company_industry: 'Tech',
};

// ---------------------------------------------------------------------------
// GET /api/applications
// ---------------------------------------------------------------------------

describe('GET /api/applications', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(createApp()).get('/api/applications');
    expect(res.status).toBe(401);
  });

  it('returns 401 when an invalid token is provided', async () => {
    const res = await request(createApp())
      .get('/api/applications')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns 200 with applications array for an authenticated user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockApplication] } as any);

    const res = await request(createApp())
      .get('/api/applications')
      .set('Authorization', makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toMatchObject({ role_title: 'Senior Engineer' });
  });

  it('returns an empty array when the user has no applications', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(createApp())
      .get('/api/applications')
      .set('Authorization', makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/applications
// ---------------------------------------------------------------------------

describe('POST /api/applications', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(createApp())
      .post('/api/applications')
      .send({ company_id: 'c-1', role_title: 'Dev' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(createApp())
      .post('/api/applications')
      .set('Authorization', makeAuthHeader())
      .send({ role_title: 'Dev' }); // missing company_id

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 201 with the created application', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockApplication] } as any);

    const res = await request(createApp())
      .post('/api/applications')
      .set('Authorization', makeAuthHeader())
      .send({ company_id: 'company-1', role_title: 'Senior Engineer' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role_title: 'Senior Engineer' });
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/applications/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/applications/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when no valid fields are provided', async () => {
    const res = await request(createApp())
      .patch('/api/applications/app-1')
      .set('Authorization', makeAuthHeader())
      .send({ invalid_field: 'value' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no valid fields/i);
  });

  it('returns 404 when application is not found or belongs to another user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any); // no rows returned from UPDATE

    const res = await request(createApp())
      .patch('/api/applications/nonexistent-id')
      .set('Authorization', makeAuthHeader())
      .send({ status: 'applied' });

    expect(res.status).toBe(404);
  });

  it('returns 200 with the updated application', async () => {
    const updated = { ...mockApplication, status: 'interviewing' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] } as any);

    const res = await request(createApp())
      .patch('/api/applications/app-1')
      .set('Authorization', makeAuthHeader())
      .send({ status: 'interviewing' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('interviewing');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/applications/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/applications/:id', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(createApp()).delete('/api/applications/app-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when application does not exist or belongs to another user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(createApp())
      .delete('/api/applications/nonexistent')
      .set('Authorization', makeAuthHeader());

    expect(res.status).toBe(404);
  });

  it('returns 200 with { deleted: true } on success', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'app-1' }] } as any);

    const res = await request(createApp())
      .delete('/api/applications/app-1')
      .set('Authorization', makeAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });
});
