import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from '../src/pages/Login';
import { useAuth } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const renderLogin = () => render(
  <MemoryRouter>
    <ThemeProvider>
      <Login />
    </ThemeProvider>
  </MemoryRouter>
);

describe('Login page', () => {
  it('does not attempt to log in when required fields are empty', async () => {
    const login = vi.fn();
    useAuth.mockReturnValue({ login });

    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(document.querySelector('form').checkValidity()).toBe(false);
    expect(login).not.toHaveBeenCalled();
  });

  it('calls login with the entered credentials', async () => {
    const login = vi.fn().mockResolvedValue({ id: '1', name: 'Test' });
    useAuth.mockReturnValue({ login });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays the error message when login fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    useAuth.mockReturnValue({ login });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
