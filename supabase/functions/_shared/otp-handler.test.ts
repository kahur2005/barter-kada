import { describe, expect, it, vi } from 'vitest';
import { createOtpHandler, type OtpHandlerDependencies } from './otp-handler';

const origin = 'https://barter.example.test';
const challengeId = '30000000-0000-4000-8000-000000000003';
const userId = '10000000-0000-4000-8000-000000000001';
const headers = { Origin: origin, Authorization: 'Bearer user-token', 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.8' };
function dependencies(overrides: Partial<OtpHandlerDependencies> = {}): OtpHandlerDependencies {
  return {
    allowedOrigin: origin, otpPepper: 'o'.repeat(32), ipPepper: 'i'.repeat(32),
    getUser: vi.fn().mockResolvedValue({ id: userId }),
    createChallenge: vi.fn().mockResolvedValue({ challengeId, expiresAt: '2026-09-11T15:05:00.000Z', resendAt: '2026-09-11T15:01:00.000Z' }),
    recordDelivery: vi.fn().mockResolvedValue(undefined),
    getChallengeContext: vi.fn().mockResolvedValue({ phone: '+6281234567890', purpose: 'register' }),
    verifyChallenge: vi.fn().mockResolvedValue({ status: 'verified', onboarding: { nextStep: 'complete' } }),
    gateway: { sendOtp: vi.fn().mockResolvedValue({ status: 'accepted', reference: 'provider-ref' }) },
    randomUUID: () => challengeId, ...overrides,
  };
}
function post(body: unknown, extraHeaders = headers) { return new Request(`${origin}/functions/v1/otp`, { method: 'POST', headers: extraHeaders, body: JSON.stringify(body) }); }

describe('OTP HTTP handler', () => {
  it('commits a secret challenge before sending and returns no code or phone', async () => {
    const order: string[] = [];
    const deps = dependencies({
      createChallenge: vi.fn(async input => { order.push('commit'); expect(input.phone).toBe('+6281234567890'); expect(input.digest).toMatch(/^[a-f0-9]{64}$/); return { challengeId, expiresAt: '2026-09-11T15:05:00.000Z', resendAt: '2026-09-11T15:01:00.000Z' }; }),
      gateway: { sendOtp: vi.fn(async () => { order.push('send'); return { status: 'accepted', reference: 'provider-ref' }; }) },
    });
    const response = await createOtpHandler(deps)(post({ action: 'request', phone: '0812 3456 7890', purpose: 'register' }));
    expect(order).toEqual(['commit', 'send']);
    expect(response.status).toBe(200); expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin); expect(response.headers.get('Cache-Control')).toBe('no-store');
    const text = await response.text(); expect(text).not.toContain('0812'); expect(text).not.toMatch(/\b\d{6}\b/);
    expect(JSON.parse(text)).toEqual({ challengeId, expiresAt: '2026-09-11T15:05:00.000Z', resendAt: '2026-09-11T15:01:00.000Z', deliveryStatus: 'accepted' });
    expect(deps.recordDelivery).toHaveBeenCalledWith(challengeId, { status: 'accepted', reference: 'provider-ref' });
  });

  it('derives the actor from the bearer token and verifies a context-bound digest', async () => {
    const deps = dependencies();
    const response = await createOtpHandler(deps)(post({ action: 'verify', challengeId, code: '123456', userId: 'attacker-controlled' }));
    expect(deps.getUser).toHaveBeenCalledWith('user-token');
    expect(deps.getChallengeContext).toHaveBeenCalledWith(challengeId, userId);
    expect(deps.verifyChallenge).toHaveBeenCalledWith(challengeId, userId, expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(await response.json()).toEqual({ status: 'verified', onboarding: { nextStep: 'complete' } });
  });

  it('rejects absent authentication and unapproved origins before touching OTP state', async () => {
    const deps = dependencies(); const handler = createOtpHandler(deps);
    const unauthenticated = await handler(post({ action: 'request', phone: '081234567890', purpose: 'register' }, { Origin: origin, 'Content-Type': 'application/json' }));
    expect(unauthenticated.status).toBe(401); expect(deps.createChallenge).not.toHaveBeenCalled();
    const foreign = await handler(post({ action: 'request', phone: '081234567890', purpose: 'register' }, { ...headers, Origin: 'https://evil.example' }));
    expect(foreign.status).toBe(403); expect(foreign.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('keeps provider failures generic while recording the precise delivery state', async () => {
    const deps = dependencies({ gateway: { sendOtp: vi.fn().mockResolvedValue({ status: 'failed', reference: null }) } });
    const response = await createOtpHandler(deps)(post({ action: 'request', phone: '+6281234567890', purpose: 'register' }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ deliveryStatus: 'failed' });
    expect(deps.recordDelivery).toHaveBeenCalledWith(challengeId, { status: 'failed', reference: null });
  });
});
