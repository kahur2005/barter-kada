import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import type { AuthGateway } from '../auth/types';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { OnboardingGateway } from '../onboarding/types';
import type { ListingGateway } from './gateway';

const repository = createPreviewRepository([], []);
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: '10000000-0000-4000-8000-000000000001', email: 'rina@example.test' }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const onboarding: OnboardingGateway = { getState: vi.fn().mockResolvedValue({ nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', maskedPhone: '+62••••7890', phoneVerified: true }), listAreas: vi.fn().mockResolvedValue([]), completeProfile: vi.fn(), setLocation: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() };
function gateway(): ListingGateway { return { saveDraft: vi.fn().mockResolvedValue({ listingId: '20000000-0000-4000-8000-000000000002', version: 1, lifecycle: 'draft' }), publish: vi.fn(), uploadImage: vi.fn(), listMine: vi.fn(), archive: vi.fn() }; }
function show(listingGateway: ListingGateway | null) { return render(<MemoryRouter initialEntries={['/listings/new']}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} listingGateway={listingGateway} /></MemoryRouter>); }

describe('listing editor', () => {
  it('shows all four stages and keeps personal publishing independent from Plus', async () => {
    show(gateway());
    expect(await screen.findByRole('heading', { name: 'Pasang penawaran' })).toBeVisible();
    for (const label of ['Penawaran', 'Detail', 'Ketersediaan', 'Tinjau']) expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByText(/Profil pribadi/)).toBeVisible();
    expect(screen.getByText(/Toko adalah fitur Plus/)).toBeVisible();
  });

  it('saves an incomplete draft through the server without claiming publication', async () => {
    const user = userEvent.setup(); const api = gateway(); show(api);
    await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.click(screen.getByRole('button', { name: 'Simpan draft' }));
    expect(api.saveDraft).toHaveBeenCalledOnce();
    expect(await screen.findByRole('status')).toHaveTextContent('Draft tersimpan');
    expect(screen.queryByText(/sudah terbit/i)).not.toBeInTheDocument();
  });

  it('explains incompatible PO/barter choices and retains the selection', async () => {
    const user = userEvent.setup(); show(gateway()); await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.selectOptions(screen.getByLabelText('Bentuk pemenuhan'), 'preorder');
    await user.click(screen.getByLabelText('Barter'));
    await user.click(screen.getByRole('button', { name: 'Lanjut ke detail' }));
    expect(screen.getByRole('alert')).toHaveTextContent('PO dan catering hanya dapat memakai jenis Jual');
    expect(screen.getByLabelText('Barter')).toBeChecked();
  });

  it('keeps preview editing honest and disables persistence', async () => {
    show(null);
    expect(await screen.findByText(/Form contoh — perubahan tidak disimpan/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Simpan draft tidak aktif' })).toBeDisabled();
  });
});
