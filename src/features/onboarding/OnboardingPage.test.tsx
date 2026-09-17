import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { AuthGateway } from '../auth/types';
import type { OnboardingGateway, OnboardingState } from './types';

const repository = createPreviewRepository([], []);
const session = { userId: '10000000-0000-4000-8000-000000000001', email: 'rina@example.test' };
const auth: AuthGateway = {
  getSession: vi.fn().mockResolvedValue(session), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(),
};
const states: Record<'profile' | 'location' | 'complete', OnboardingState> = {
  profile: { nextStep: 'profile', displayName: '', bio: null, areaId: null, address: null, maskedPhone: null, phoneVerified: false },
  location: { nextStep: 'location', displayName: 'Rina', bio: 'Katering rumahan', areaId: null, address: null, maskedPhone: null, phoneVerified: false },
  complete: { nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: null, phoneVerified: false },
};
function gateway(initial: keyof typeof states): OnboardingGateway {
  return {
    getState: vi.fn().mockResolvedValue(states[initial]), listAreas: vi.fn().mockResolvedValue([{ areaId: 'depok', name: 'Depok' }]),
    completeProfile: vi.fn().mockResolvedValue(initial === 'complete' ? states.complete : states.location), setLocation: vi.fn().mockResolvedValue(states.complete),
  };
}
function show(onboarding: OnboardingGateway) {
  return render(<MemoryRouter initialEntries={['/onboarding']}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} /></MemoryRouter>);
}

describe('account onboarding', () => {
  it('shows the two stages and retains a validation error before saving profile', async () => {
    const user = userEvent.setup(); const api = gateway('profile'); show(api);
    expect(await screen.findByText('Data diri')).toBeVisible();
    expect(screen.getByText('Lokasi')).toBeVisible(); expect(screen.queryByText(/Verifikasi WhatsApp/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nama yang ditampilkan'), 'R');
    await user.click(screen.getByRole('button', { name: 'Simpan dan lanjut' }));
    expect(screen.getByRole('alert')).toHaveTextContent('minimal 2 karakter');
    expect(screen.getByLabelText('Nama yang ditampilkan')).toHaveValue('R');
    expect(api.completeProfile).not.toHaveBeenCalled();
  });

  it('never asks geolocation automatically and only saves after explicit consent', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    const user = userEvent.setup(); const api = gateway('location'); show(api);
    await screen.findByRole('heading', { name: 'Atur lokasi privat' });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Wilayah'), 'depok');
    await user.click(screen.getByRole('button', { name: 'Gunakan lokasi perangkat' }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('completes the account after saving location without WhatsApp verification', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({
      coords: { latitude: -6.2, longitude: 106.8 },
    } as GeolocationPosition));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    const user = userEvent.setup(); const api = gateway('location');
    vi.mocked(api.setLocation).mockResolvedValue(states.complete);
    show(api);

    await screen.findByRole('heading', { name: 'Atur lokasi privat' });
    await user.selectOptions(screen.getByLabelText('Wilayah'), 'depok');
    await user.click(screen.getByRole('button', { name: 'Gunakan lokasi perangkat' }));
    await user.click(screen.getByRole('button', { name: 'Simpan lokasi dan lanjut' }));

    expect(await screen.findByRole('heading', { name: 'Akun siap digunakan' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /WhatsApp/i })).not.toBeInTheDocument();
  });

  it('lets a completed account edit its profile without a phone verification flow', async () => {
    const user = userEvent.setup(); const api = gateway('complete');
    vi.mocked(api.getState).mockResolvedValue({ ...states.complete, address: 'Jalan Melati 2, Depok' });
    show(api);
    expect(await screen.findByRole('heading', { name: 'Perbarui data diri' })).toBeVisible();
    expect(screen.getByLabelText('Wilayah')).toHaveValue('depok');
    expect(screen.getByLabelText(/Alamat\/patokan/)).toHaveValue('Jalan Melati 2, Depok');
    const name = screen.getByLabelText('Nama yang ditampilkan');
    await user.clear(name); await user.type(name, 'Rina Baru');
    await user.click(screen.getByRole('button', { name: 'Simpan data diri' }));
    expect(api.completeProfile).toHaveBeenCalledWith({ displayName: 'Rina Baru', bio: null });

    expect(screen.queryByRole('heading', { name: /WhatsApp/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nomor WhatsApp/i)).not.toBeInTheDocument();
  });
});
