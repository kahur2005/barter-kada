import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { AuthGateway } from './types';

const repository = createPreviewRepository([], []);
const auth: AuthGateway = {
  getSession: vi.fn().mockResolvedValue({ userId: '10000000-0000-4000-8000-000000000001', email: 'rina@example.test' }),
  subscribe: vi.fn(() => () => undefined),
  signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(),
};

describe('account navigation', () => {
  it('exposes the product areas from the account page', async () => {
    render(<MemoryRouter initialEntries={['/profile']}><App repository={repository} authGateway={auth} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Akun' })).toBeVisible();
    const menu = within(screen.getByRole('navigation', { name: 'Menu akun' }));
    expect(menu.getByRole('link', { name: 'Profil & lokasi' })).toHaveAttribute('href', '/onboarding');
    expect(menu.getByRole('link', { name: 'Listing saya' })).toHaveAttribute('href', '/my/listings');
    expect(menu.getByRole('link', { name: 'Toko saya' })).toHaveAttribute('href', '/my/stores');
    expect(menu.getByRole('link', { name: 'Akun Plus' })).toHaveAttribute('href', '/plus');
    expect(menu.getByRole('link', { name: 'Transaksi saya' })).toHaveAttribute('href', '/transactions');
    expect(menu.getByRole('link', { name: 'Notifikasi' })).toHaveAttribute('href', '/notifications');
  });
});
