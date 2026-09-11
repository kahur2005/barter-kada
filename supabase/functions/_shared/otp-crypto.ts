export type OtpPurpose = 'register' | 'change_phone';
export type OtpDigestInput = { challengeId: string; userId: string; phone: string; purpose: OtpPurpose; code: string };

const OTP_SPACE = 1_000_000;
const UINT32_SPACE = 0x1_0000_0000;
const UNBIASED_LIMIT = Math.floor(UINT32_SPACE / OTP_SPACE) * OTP_SPACE;
const encoder = new TextEncoder();

export function createOtpCode(randomValues: (array: Uint32Array) => Uint32Array = crypto.getRandomValues.bind(crypto)): string {
  const sample = new Uint32Array(1);

  for (let attempt = 0; attempt < 128; attempt += 1) {
    randomValues(sample);
    if (sample[0] < UNBIASED_LIMIT) return String(sample[0] % OTP_SPACE).padStart(6, '0');
  }

  throw new Error('Generator OTP tidak tersedia.');
}

export async function otpDigest(input: OtpDigestInput, pepper: string): Promise<string> {
  const validPurpose = input.purpose === 'register' || input.purpose === 'change_phone';
  const validContext = input.challengeId.length > 0 && input.userId.length > 0 && input.phone.length > 0;
  if (encoder.encode(pepper).byteLength < 32 || !validPurpose || !validContext || !/^\d{6}$/.test(input.code)) {
    throw new Error('Konfigurasi OTP server tidak valid.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = encoder.encode(JSON.stringify([
    input.challengeId,
    input.userId,
    input.phone,
    input.purpose,
    input.code,
  ]));
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, payload));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
