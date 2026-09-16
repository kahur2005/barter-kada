import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { AuthGateway } from './types';

const repository = createPreviewRepository([], []);

function createMockAuth(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getSession: vi.fn().mockResolvedValue({
      userId: '10000000-0000-4000-8000-000000000001',
      email: 'rina@example.test',
      avatarUrl: null,
    }),
    subscribe: vi.fn(() => () => undefined),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    uploadAvatar: vi.fn().mockResolvedValue('https://example.test/avatars/uploaded.webp'),
    deleteAvatar: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('account navigation', () => {
  it('exposes the product areas from the account page', async () => {
    const auth = createMockAuth();
    render(<MemoryRouter initialEntries={['/profile']}><App repository={repository} authGateway={auth} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Akun' })).toBeVisible();
    const menu = within(screen.getByRole('navigation', { name: 'Menu akun' }));
    expect(menu.getByRole('link', { name: 'Profil & verifikasi' })).toHaveAttribute('href', '/onboarding');
    expect(menu.getByRole('link', { name: 'Listing saya' })).toHaveAttribute('href', '/my/listings');
    expect(menu.getByRole('link', { name: 'Toko saya' })).toHaveAttribute('href', '/my/stores');
    expect(menu.getByRole('link', { name: 'Akun Plus' })).toHaveAttribute('href', '/plus');
    expect(menu.getByRole('link', { name: 'Transaksi saya' })).toHaveAttribute('href', '/transactions');
    expect(menu.getByRole('link', { name: 'Notifikasi' })).toHaveAttribute('href', '/notifications');
  });

  it('allows uploading and deleting a profile avatar', async () => {
    const user = userEvent.setup();
    const auth = createMockAuth();
    render(<MemoryRouter initialEntries={['/profile']}><App repository={repository} authGateway={auth} /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: 'Unggah foto profil' })).toBeVisible();

    // Upload an avatar
    const file = new File(['avatar-content'], 'profile.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Foto profil/i, { selector: 'input[type="file"]' });
    await user.upload(fileInput, file);

    expect(auth.uploadAvatar).toHaveBeenCalledWith(file);
    expect(await screen.findByText('Foto profil berhasil diperbarui.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ganti foto' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hapus foto' })).toBeVisible();

    // Delete the avatar
    await user.click(screen.getByRole('button', { name: 'Hapus foto' }));
    expect(auth.deleteAvatar).toHaveBeenCalled();
    expect(await screen.findByText('Foto profil berhasil dihapus.')).toBeVisible();
  });
});
