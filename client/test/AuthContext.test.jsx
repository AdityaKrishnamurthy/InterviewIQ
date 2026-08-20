import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

const Probe = () => {
  const { user, isAuthenticated, login, logout, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login('test@example.com', 'password123').catch(() => {})}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

const renderProbe = () => render(
  <AuthProvider>
    <Probe />
  </AuthProvider>
);

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthContext', () => {
  it('starts unauthenticated when no token is stored', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
  });

  it('logs in, stores the token, and exposes the user', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'fake-jwt', user: { id: '1', email: 'test@example.com' } }),
    });

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(localStorage.getItem('interviewiq_token')).toBe('fake-jwt');
  });

  it('clears the session on logout', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'fake-jwt', user: { id: '1', email: 'test@example.com' } }),
    });

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(localStorage.getItem('interviewiq_token')).toBeNull();
  });

  it('rejects login and does not store a token when the API returns an error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));
    expect(localStorage.getItem('interviewiq_token')).toBeNull();
  });
});
