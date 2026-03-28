import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// Mock the api module
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
import { AuthProvider } from '../hooks/useAuth.tsx';
import { Login } from '../pages/Login.tsx';

const mockApi = vi.mocked(api);

// Render helper — Login needs AuthProvider + Router
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    // Default: profile fetch fails (no logged-in user)
    (mockApi.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'));
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the sign-in form by default', async () => {
    renderLogin();
    expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('shows the register form when the toggle link is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await screen.findByText('Sign in to your account');
    await user.click(screen.getByText("Don't have an account? Register"));

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('switches back to sign-in when "Already have an account?" is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await screen.findByText('Sign in to your account');
    await user.click(screen.getByText("Don't have an account? Register"));
    await user.click(screen.getByText('Already have an account? Sign in'));

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Form submission — login
  // -------------------------------------------------------------------------

  it('calls login with the entered credentials on submit', async () => {
    const user = userEvent.setup();
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        user: { id: 'u1', email: 'niall@example.com', name: 'Niall', created_at: '' },
        token: 'jwt-token',
      },
    });

    renderLogin();
    await screen.findByText('Sign in to your account');

    await user.type(screen.getByLabelText('Email'), 'niall@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'niall@example.com',
        password: 'password123',
      });
    });
  });

  it('displays an error message when login fails', async () => {
    const user = userEvent.setup();
    (mockApi.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Invalid email or password' } },
    });

    renderLogin();
    await screen.findByText('Sign in to your account');

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'badpassword');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('disables the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: any) => void;
    (mockApi.post as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => { resolvePost = resolve; }),
    );

    renderLogin();
    await screen.findByText('Sign in to your account');

    await user.type(screen.getByLabelText('Email'), 'niall@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Button should be disabled while pending
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();

    // Resolve the promise and clean up
    resolvePost({ data: { user: { id: 'u1', email: '', name: '', created_at: '' }, token: 't' } });
  });

  // -------------------------------------------------------------------------
  // Form submission — register
  // -------------------------------------------------------------------------

  it('calls register with name, email, and password when in register mode', async () => {
    const user = userEvent.setup();
    (mockApi.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        user: { id: 'u2', email: 'new@example.com', name: 'New User', created_at: '' },
        token: 'register-jwt',
      },
    });

    renderLogin();
    await screen.findByText('Sign in to your account');
    await user.click(screen.getByText("Don't have an account? Register"));

    await user.type(screen.getByLabelText('Name'), 'New User');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });
    });
  });

  it('clears the error message when the user toggles between login and register', async () => {
    const user = userEvent.setup();
    (mockApi.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Invalid email or password' } },
    });

    renderLogin();
    await screen.findByText('Sign in to your account');

    // Trigger an error
    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'badpassword');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();

    // Toggle clears the error
    await user.click(screen.getByText("Don't have an account? Register"));
    expect(screen.queryByText('Invalid email or password')).not.toBeInTheDocument();
  });
});
