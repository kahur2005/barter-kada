import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { AuthGateway } from '../auth/types';
import type { OnboardingGateway } from '../onboarding/types';
import type { StoreGateway } from './gateway';

const repository = createPreviewRepository([], []);
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: '10000000-0000-0000-0000-000000000001', email: 'rina@example.test' }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const onboarding: OnboardingGateway = { getState: vi.fn().mockResolvedValue({ nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: null, phoneVerified: false }), listAreas: vi.fn().mockResolvedValue([]), completeProfile: vi.fn(), setLocation: vi.fn() };

function storeGateway(): StoreGateway {
  const getPlusStatus = vi.fn()
    .mockResolvedValueOnce({ priceRupiah: '20000', maxStores: 3, active: false, paidThrough: null, storeCount: 0 })
    .mockResolvedValueOnce({ priceRupiah: '20000', maxStores: 3, active: true, paidThrough: '2026-10-12T00:00:00.000Z', storeCount: 0 });
  return {
    getPlusStatus,
    createBillingOrder: vi.fn().mockResolvedValue({ id: 'd1000000-0000-0000-0000-000000000001', amountRupiah: '20000', method: 'qris', mode: 'dummy', status: 'pending', expiresAt: '2026-09-13T03:00:00.000Z' }),
    simulateBilling: vi.fn().mockResolvedValue({ id: 'd1000000-0000-0000-0000-000000000001', status: 'succeeded', active: true }),
    createStore: vi.fn(),
    updateStore: vi.fn(),
    getMyStores: vi.fn().mockResolvedValue([]),
  };
}

describe('Plus page', () => {
  it('activates Plus after the user taps Beli akun Plus', async () => {
    const user = userEvent.setup();
    const gateway = storeGateway();
    render(<MemoryRouter initialEntries={['/plus']}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} storeGateway={gateway} /></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: 'Beli akun Plus' }));

    await waitFor(() => expect(gateway.createBillingOrder).toHaveBeenCalledWith('qris'));
    expect(gateway.simulateBilling).toHaveBeenCalledWith('d1000000-0000-0000-0000-000000000001', 'succeeded');
    expect(await screen.findByText(/Aktif sampai/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kelola toko' })).toHaveAttribute('href', '/my/stores');
  });
});
