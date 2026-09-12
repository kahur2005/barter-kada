import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { AuthGateway } from '../auth/types';
import type { OnboardingGateway } from '../onboarding/types';
import type { StoreGateway } from './gateway';

const repository = createPreviewRepository([], []);
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: '10000000-0000-4000-8000-000000000001', email: 'rina@example.test' }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const onboarding: OnboardingGateway = { getState: vi.fn().mockResolvedValue({ nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', maskedPhone: '+62••••7890', phoneVerified: true }), listAreas: vi.fn().mockResolvedValue([]), completeProfile: vi.fn(), setLocation: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() };

function storeGateway(): StoreGateway {
  return { getPlusStatus: vi.fn(), createBillingOrder: vi.fn(), simulateBilling: vi.fn(), createStore: vi.fn(), getMyStores: vi.fn().mockResolvedValue([{ id: 'd1000000-0000-4000-8000-000000000001', slug: 'dapur-rina', name: 'Dapur Rina', description: 'Menu rumahan.', category: 'Makanan', areaId: 'depok', areaLabel: 'Depok', operatingHours: 'Senin-Sabtu', handoverMethods: ['meetup'], publicAddress: null, publicAddressConsent: false, status: 'active' }]), updateStore: vi.fn().mockResolvedValue({ id: 'd1000000-0000-4000-8000-000000000001', slug: 'dapur-rina', name: 'Dapur Rina Baru', description: 'Menu rumahan.', category: 'Makanan', areaId: 'depok', areaLabel: 'Depok', operatingHours: 'Senin-Sabtu', handoverMethods: ['meetup'], publicAddress: null, publicAddressConsent: false, status: 'active' }) };
}

describe('my stores', () => {
  it('loads server values and saves an edited store profile', async () => {
    const user = userEvent.setup(); const gateway = storeGateway();
    render(<MemoryRouter initialEntries={['/my/stores']}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} storeGateway={gateway} /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Edit profil' }));
    const name = screen.getByLabelText('Nama toko');
    expect(name).toHaveValue('Dapur Rina');
    await user.clear(name); await user.type(name, 'Dapur Rina Baru');
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(gateway.updateStore).toHaveBeenCalledWith('d1000000-0000-4000-8000-000000000001', expect.objectContaining({ name: 'Dapur Rina Baru', slug: 'dapur-rina' }));
  });
});
