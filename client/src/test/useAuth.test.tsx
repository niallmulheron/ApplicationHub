import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock the api module so we never make real HTTP calls
vi.mock('../services/api.ts', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '../services/api.ts';
import { AuthProvider, useAuth } from '../hooks/useAuth.tsx';

const mockApi = vi.mocked(api);

// Wrapper that provides AuthContext to the hook under test
function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  it('starts with isLoading=false and user=null when no token is stored', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('fetches the user profile on mount when a token is in localStorage', async () => {
    localStorage.setItem('token', 'existing-token');
    const mockUser = { id: 'u1', email: 'niall@example.com', name: 'Niall', created_at: '' };
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toMatchObject({ email: 'niall@example.com' });
    expect(mockApi.get).toHaveBeenCalledWith('/profile');
  });

  it('clears the token and sets user=null if the profile fetch fails', async () => {
    localStorage.setItem('token', 'bad-token');
    (mockApi.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  it('login sets user, token, and persists token in localStorage', async () => {
    const mockUser = { id: 'u1', email: 'niall@example.com', name: 'Niall', created_at: '' };
    // api.post resolves with the new user + token
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: mockUser, token: 'new-jwt' },
    });
    // When login sets the token, useEffect re-runs and calls api.get('/profile')
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('niall@example.com', 'password123');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toMatchObject({ email: 'niall@example.com' });
    expect(result.current.token).toBe('new-jwt');
    expect(localStorage.getItem('token')).toBe('new-jwt');
  });

  it('login propagates errors so the UI can display them', async () => {
    (mockApi.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Invalid email or password' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => result.current.login('x@x.com', 'wrong')),
    ).rejects.toMatchObject({ response: { data: { error: 'Invalid email or password' } } });
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  it('register sets user and token just like login', async () => {
    const mockUser = { id: 'u2', email: 'new@example.com', name: 'New User', created_at: '' };
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: mockUser, token: 'register-jwt' },
    });
    // After register sets the token, useEffect re-runs and calls api.get('/profile')
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.register('new@example.com', 'password123', 'New User');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toMatchObject({ name: 'New User' });
    expect(localStorage.getItem('token')).toBe('register-jwt');
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  it('logout clears user, token, and removes token from localStorage', async () => {
    // Set up a logged-in state first
    localStorage.setItem('token', 'existing-token');
    const mockUser = { id: 'u1', email: 'niall@example.com', name: 'Niall', created_at: '' };
    (mockApi.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // useAuth outside provider
  // -------------------------------------------------------------------------

  it('throws an error when used outside AuthProvider', () => {
    // Suppress the expected React error boundary output
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});
