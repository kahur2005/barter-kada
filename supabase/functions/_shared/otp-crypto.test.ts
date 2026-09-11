import { describe, expect, it } from 'vitest';
import { createOtpCode, otpDigest, type OtpDigestInput } from './otp-crypto';

const input: OtpDigestInput = {
  challengeId: '10000000-0000-4000-8000-000000000001',
  userId: '20000000-0000-4000-8000-000000000002',
  phone: '+6281234567890', purpose: 'register', code: '004212',
};
const pepper = 'p'.repeat(32);

describe('createOtpCode', () => {
  it('creates an exact six-digit string from cryptographic random input', () => {
    const random = (array: Uint32Array) => { array[0] = 4_212; return array; };
    expect(createOtpCode(random)).toBe('004212');
  });

  it('rejects biased tail values before taking modulo', () => {
    const values = [4_294_967_295, 999_999];
    const random = (array: Uint32Array) => { array[0] = values.shift()!; return array; };
    expect(createOtpCode(random)).toBe('999999');
  });
});

describe('otpDigest', () => {
  it('is stable for the same challenge context', async () => {
    expect(await otpDigest(input, pepper)).toBe(await otpDigest(input, pepper));
    expect(await otpDigest(input, pepper)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('binds the digest to actor, challenge, number, purpose, and code', async () => {
    const baseline = await otpDigest(input, pepper);
    for (const changed of [
      { ...input, userId: '30000000-0000-4000-8000-000000000003' },
      { ...input, challengeId: '40000000-0000-4000-8000-000000000004' },
      { ...input, phone: '+6289876543210' },
      { ...input, purpose: 'change_phone' as const },
      { ...input, code: '004213' },
    ]) expect(await otpDigest(changed, pepper)).not.toBe(baseline);
  });

  it('rejects a weak server pepper without exposing the code', async () => {
    await expect(otpDigest(input, 'short')).rejects.toThrow('Konfigurasi OTP server tidak valid.');
    try { await otpDigest(input, 'short'); } catch (error) { expect(String(error)).not.toContain(input.code); }
  });
});
