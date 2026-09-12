import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import type { AuthGateway } from '../auth/types';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { OnboardingGateway } from '../onboarding/types';
import type { ListingGateway } from './gateway';

const repository = createPreviewRepository([], []);
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: '10000000-0000-4000-8000-000000000001', email: null }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const onboarding: OnboardingGateway = { getState: vi.fn().mockResolvedValue({ nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: null, phoneVerified: true }), listAreas: vi.fn(), completeProfile: vi.fn(), setLocation: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() };
const listingGateway: ListingGateway = {
  saveDraft: vi.fn(), publish: vi.fn(), getMine: vi.fn(), uploadImage: vi.fn(), archive: vi.fn().mockResolvedValue(undefined),
  listMine: vi.fn().mockResolvedValue({ activeCount: 12, activeLimit: 20, items: [
    { listingId: '20000000-0000-4000-8000-000000000002', title: 'Kursi kayu', lifecycle: 'active', version: 3, reserved: false, updatedAt: '2026-09-11T12:00:00Z', publisher: { kind: 'store', storeId: '70000000-0000-4000-8000-000000000007', storeName: 'Dapur Rina', storeSlug: 'dapur-rina' } },
    { listingId: '30000000-0000-4000-8000-000000000003', title: 'Sepeda reserved', lifecycle: 'active', version: 2, reserved: true, updatedAt: '2026-09-11T11:00:00Z' },
  ] }),
};

it('uses server quota and prevents archiving an exclusively reserved listing', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/my/listings']}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} listingGateway={listingGateway} /></MemoryRouter>);
  expect(await screen.findByText('12 dari 20 aktif')).toBeVisible();
  expect(screen.getByText('Toko: Dapur Rina')).toBeVisible();
  for (const tab of ['Aktif', 'Draft', 'Arsip', 'Selesai']) expect(screen.getByRole('tab', { name: tab })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Arsipkan Sepeda reserved' })).toBeDisabled();
  expect(screen.getByText(/Selesaikan atau batalkan transaksi aktif/)).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute('href', '/my/listings/20000000-0000-4000-8000-000000000002/edit');
  await user.click(screen.getByRole('button', { name: 'Arsipkan Kursi kayu' }));
  expect(listingGateway.archive).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000002', 3);
});
