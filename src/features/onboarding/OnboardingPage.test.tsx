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
const states: Record<'profile' | 'location' | 'phone' | 'complete', OnboardingState> = {
  profile: { nextStep: 'profile', displayName: '', bio: null, areaId: null, address: null, maskedPhone: null, phoneVerified: false },
  location: { nextStep: 'location', displayName: 'Rina', bio: 'Katering rumahan', areaId: null, address: null, maskedPhone: null, phoneVerified: false },
  phone: { nextStep: 'phone', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: null, phoneVerified: false },
  complete: { nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: '+62••••7890', phoneVerified: true },
};
function gateway(initial: keyof typeof states): OnboardingGateway {
  return {
    getState: vi.fn().mockResolvedValue(states[initial]), listAreas: vi.fn().mockResolvedValue([{ areaId: 'depok', name: 'Depok' }]),
    completeProfile: vi.fn().mockResolvedValue(initial === 'complete' ? states.complete : states.location), setLocation: vi.fn().mockResolvedValue(initial === 'complete' ? states.complete : states.phone),
    requestOtp: vi.fn().mockResolvedValue({ challengeId: '20000000-0000-4000-8000-000000000002', expiresAt: '2026-09-11T15:05:00Z', resendAt: '2026-09-11T15:01:00Z', deliveryStatus: 'accepted' }),
    verifyOtp: vi.fn().mockResolvedValue(states.complete),
  };
}
function show(onboarding: OnboardingGateway) {
  return render(<MemoryRouter initialEntries={['/onboarding']}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} /></MemoryRouter>);
}

describe('account onboarding', () => {
  it('shows the three stages and retains a validation error before saving profile', async () => {
    const user = userEvent.setup(); const api = gateway('profile'); show(api);
    expect(await screen.findByText('Data diri')).toBeVisible();
    expect(screen.getByText('Lokasi')).toBeVisible(); expect(screen.getByText('Verifikasi WhatsApp')).toBeVisible();
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

  it('treats provider acceptance as waiting for user verification', async () => {
    const user = userEvent.setup(); const api = gateway('phone'); show(api);
    await user.type(await screen.findByLabelText('Nomor WhatsApp'), '081234567890');
    await user.click(screen.getByRole('button', { name: 'Kirim kode' }));
    expect(await screen.findByText(/permintaan kode diterima OpenWA/i)).toBeVisible();
    expect(screen.getByLabelText('Kode verifikasi')).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByLabelText('Kode verifikasi')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.queryByText(/nomor terverifikasi/i)).not.toBeInTheDocument();
  });

  it('lets a completed account edit its profile and start a change-phone OTP flow', async () => {
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

    await user.type(screen.getByLabelText('Nomor WhatsApp baru'), '081234567890');
    await user.click(screen.getByRole('button', { name: 'Kirim kode ke nomor baru' }));
    expect(api.requestOtp).toHaveBeenCalledWith({ phone: '081234567890', purpose: 'change_phone' });
    expect(await screen.findByText(/permintaan kode diterima OpenWA/i)).toBeVisible();
  });
});
