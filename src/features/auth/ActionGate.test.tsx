import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { OnboardingGateway, OnboardingState } from '../onboarding/types';
import type { AuthGateway, AuthSession } from './types';

const repository = createPreviewRepository([], []);
const session: AuthSession = { userId: '10000000-0000-4000-8000-000000000001', email: 'rina@example.test' };
function auth(current: AuthSession | null): AuthGateway { return { getSession: vi.fn().mockResolvedValue(current), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn().mockResolvedValue(undefined) }; }
function onboarding(nextStep: OnboardingState['nextStep']): OnboardingGateway {
  return { getState: vi.fn().mockResolvedValue({ nextStep, displayName: 'Rina', bio: null, areaId: nextStep === 'profile' ? null : 'depok', maskedPhone: nextStep === 'complete' ? '+62••••7890' : null, phoneVerified: nextStep === 'complete' }), listAreas: vi.fn().mockResolvedValue([]), completeProfile: vi.fn(), setLocation: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() };
}
function show(path: string, authGateway: AuthGateway, onboardingGateway: OnboardingGateway | null) { return render(<MemoryRouter initialEntries={[path]}><App repository={repository} authGateway={authGateway} onboardingGateway={onboardingGateway} /></MemoryRouter>); }

describe('private action gates', () => {
  it('sends a guest to login while preserving the safe destination', async () => {
    show('/listings/new', auth(null), onboarding('complete'));
    expect(await screen.findByRole('heading', { name: 'Masuk ke Barter' })).toBeVisible();
  });
  it('sends an incomplete account to onboarding', async () => {
    show('/chat', auth(session), onboarding('location'));
    expect(await screen.findByRole('heading', { name: 'Lengkapi akun' })).toBeVisible();
  });
  it('allows a completed account to reach the requested feature', async () => {
    show('/listings/new', auth(session), onboarding('complete'));
    expect(await screen.findByRole('heading', { name: 'Pasang penawaran' })).toBeVisible();
  });
  it('signs out from the account page without exposing provider errors', async () => {
    const user = userEvent.setup(); const authGateway = auth(session); show('/profile', authGateway, onboarding('complete'));
    await user.click(await screen.findByRole('button', { name: 'Keluar dari akun' }));
    expect(authGateway.signOut).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Masuk ke Barter' })).toBeVisible();
  });
});
