import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { AuthGateway } from './types';

const repository = createPreviewRepository([], []);
function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getSession: vi.fn().mockResolvedValue(null), subscribe: vi.fn(() => () => undefined),
    signInWithPassword: vi.fn().mockResolvedValue(undefined), signUpWithPassword: vi.fn().mockResolvedValue('confirmation_required'),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined), signOut: vi.fn().mockResolvedValue(undefined), ...overrides,
  };
}
function show(path: string, authGateway: AuthGateway | null) {
  return render(<MemoryRouter initialEntries={[path]}><App repository={repository} authGateway={authGateway} /></MemoryRouter>);
}

describe('authentication pages', () => {
  it('shows the listing return intent on the focused login surface', () => {
    const auth = gateway(); show('/auth/login?returnTo=/listings/new', auth);
    const heading = screen.getByRole('heading', { name: 'Masuk, lalu pasang barangmu.' });
    expect(heading.closest('section')).toHaveClass('auth-card--focused');
    expect(screen.getByText('Lanjutkan untuk memasang penawaranmu.')).toBeVisible();
  });

  it('validates email and password before trying password login', async () => {
    const user = userEvent.setup(); const auth = gateway(); show('/auth/login', auth);
    await user.type(screen.getByLabelText('Email'), 'bukan-email');
    await user.type(screen.getByLabelText('Kata sandi'), 'pendek');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(screen.getByRole('alert')).toHaveTextContent('email yang valid');
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('registers with email and preserves the confirmation outcome', async () => {
    const user = userEvent.setup(); const auth = gateway(); show('/auth/register', auth);
    await user.type(screen.getByLabelText('Email'), 'rina@example.test');
    await user.type(screen.getByLabelText('Kata sandi'), 'aman-sekali');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Periksa emailmu');
    expect(auth.signUpWithPassword).toHaveBeenCalledWith('rina@example.test', 'aman-sekali', `${window.location.origin}/auth/callback`);
  });

  it('uses the fixed callback URL for Google without claiming a completed account', async () => {
    const user = userEvent.setup(); const auth = gateway(); show('/auth/login', auth);
    await user.click(screen.getByRole('button', { name: 'Lanjutkan dengan Google' }));
    expect(auth.signInWithGoogle).toHaveBeenCalledWith(`${window.location.origin}/auth/callback`);
    expect(screen.queryByText(/akun lengkap/i)).not.toBeInTheDocument();
  });

  it('explains that preview login is unavailable instead of inventing a user', () => {
    show('/auth/login', null);
    expect(screen.getByText(/Login dinonaktifkan pada mode data contoh/)).toBeVisible();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
