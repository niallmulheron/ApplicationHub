/**
 * Tests for the Axios api service (src/services/api.ts).
 *
 * We use axios-mock-adapter to intercept requests at the adapter level so we
 * can inspect what the interceptors actually attach to each request/response —
 * without making real HTTP calls or fighting jsdom's URL limitations.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '../services/api.ts';

let mock: InstanceType<typeof MockAdapter>;

beforeEach(() => {
  mock = new MockAdapter(api);
  localStorage.clear();
});

afterEach(() => {
  mock.restore();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Request interceptor — Authorization header injection
// ---------------------------------------------------------------------------

describe('request interceptor — token injection', () => {
  it('adds Authorization header when a token is in localStorage', async () => {
    localStorage.setItem('token', 'my-jwt-token');
    mock.onGet('/profile').reply(200, { id: 'u1' });

    await api.get('/profile');

    const sentHeaders = mock.history.get[0].headers as Record<string, string>;
    expect(sentHeaders['Authorization']).toBe('Bearer my-jwt-token');
  });

  it('does NOT add Authorization header when no token is in localStorage', async () => {
    mock.onGet('/profile').reply(200, { id: 'u1' });

    await api.get('/profile');

    const sentHeaders = mock.history.get[0].headers as Record<string, string>;
    expect(sentHeaders['Authorization']).toBeUndefined();
  });

  it('picks up a freshly stored token between requests', async () => {
    mock.onGet('/profile').reply(200, {});

    // First request — no token
    await api.get('/profile');
    expect((mock.history.get[0].headers as any)['Authorization']).toBeUndefined();

    // Second request — token now set
    localStorage.setItem('token', 'second-request-token');
    await api.get('/profile');
    expect((mock.history.get[1].headers as any)['Authorization']).toBe('Bearer second-request-token');
  });
});

// ---------------------------------------------------------------------------
// Response interceptor — 401 redirect
// ---------------------------------------------------------------------------

describe('response interceptor — 401 redirect', () => {
  it('removes the token from localStorage on a 401 response', async () => {
    localStorage.setItem('token', 'expired-token');
    mock.onGet('/profile').reply(401, { error: 'Unauthorized' });

    await expect(api.get('/profile')).rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('redirects to /login on a 401 response', async () => {
    mock.onGet('/profile').reply(401, { error: 'Unauthorized' });

    await expect(api.get('/profile')).rejects.toThrow();

    expect(window.location.href).toBe('/login');
  });

  it('passes through 404 errors without clearing the token', async () => {
    localStorage.setItem('token', 'valid-token');
    mock.onGet('/missing').reply(404, { error: 'Not found' });

    await expect(api.get('/missing')).rejects.toThrow();

    // Token should be untouched for non-401 errors
    expect(localStorage.getItem('token')).toBe('valid-token');
  });

  it('passes through 500 errors without redirecting to login', async () => {
    mock.onGet('/crash').reply(500, { error: 'Server error' });
    window.location.href = 'http://localhost:5173/dashboard';

    await expect(api.get('/crash')).rejects.toThrow();

    expect(window.location.href).not.toBe('/login');
  });
});
