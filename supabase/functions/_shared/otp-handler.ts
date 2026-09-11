import type { OpenWaGateway, OtpDelivery } from './openwa';
import { createOtpCode, otpDigest, type OtpPurpose } from './otp-crypto';
import { normalizeIndonesianPhone } from './phone';

export type ChallengeRecord = { challengeId: string; expiresAt: string; resendAt: string };
export type ChallengeContext = { phone: string; purpose: OtpPurpose };
export type VerifyRecord = { status: string; onboarding?: unknown };
export type OtpHandlerDependencies = {
  allowedOrigin: string;
  otpPepper: string;
  ipPepper: string;
  getUser(token: string): Promise<{ id: string } | null>;
  createChallenge(input: { challengeId: string; userId: string; phone: string; purpose: OtpPurpose; digest: string; ipHash: string }): Promise<ChallengeRecord>;
  recordDelivery(challengeId: string, delivery: OtpDelivery): Promise<void>;
  getChallengeContext(challengeId: string, userId: string): Promise<ChallengeContext | null>;
  verifyChallenge(challengeId: string, userId: string, digest: string): Promise<VerifyRecord>;
  gateway: OpenWaGateway;
  randomUUID?: () => string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function privateDigest(value: string, pepper: string): Promise<string> {
  if (encoder.encode(pepper).byteLength < 32) throw new Error('Konfigurasi OTP server tidak valid.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function response(origin: string, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Access-Control-Allow-Origin': origin, 'Cache-Control': 'no-store', Vary: 'Origin' } });
}

export function createOtpHandler(dependencies: OtpHandlerDependencies) {
  let allowedOrigin: string;
  try {
    const parsed = new URL(dependencies.allowedOrigin);
    if (parsed.origin !== dependencies.allowedOrigin || !['https:', 'http:'].includes(parsed.protocol)) throw new Error();
    allowedOrigin = parsed.origin;
  } catch {
    throw new Error('Konfigurasi origin OTP tidak valid.');
  }

  return async (request: Request): Promise<Response> => {
    const requestOrigin = request.headers.get('Origin');
    if (requestOrigin !== allowedOrigin) return Response.json({ error: 'Permintaan tidak diizinkan.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' } });
    if (request.method !== 'POST') return response(allowedOrigin, { error: 'Metode tidak didukung.' }, 405);

    try {
      const authorization = request.headers.get('Authorization') ?? '';
      const match = /^Bearer ([^\s]+)$/.exec(authorization);
      if (!match) throw new RequestError(401, 'Sesi diperlukan.');
      const user = await dependencies.getUser(match[1]);
      if (!user) throw new RequestError(401, 'Sesi tidak valid.');
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new RequestError(415, 'Gunakan JSON.');

      let body: unknown;
      try { body = await request.json(); } catch { throw new RequestError(400, 'Permintaan tidak valid.'); }
      if (typeof body !== 'object' || body === null || !('action' in body)) throw new RequestError(400, 'Permintaan tidak valid.');

      if (body.action === 'request') {
        if (!('phone' in body) || typeof body.phone !== 'string' || !('purpose' in body) || (body.purpose !== 'register' && body.purpose !== 'change_phone')) throw new RequestError(400, 'Permintaan tidak valid.');
        let phone: string;
        try { phone = normalizeIndonesianPhone(body.phone); } catch { throw new RequestError(400, 'Nomor WhatsApp tidak valid.'); }
        const purpose = body.purpose as OtpPurpose;
        const challengeId = (dependencies.randomUUID ?? crypto.randomUUID.bind(crypto))();
        if (!UUID.test(challengeId)) throw new Error('Generator challenge tidak valid.');
        const code = createOtpCode();
        const digest = await otpDigest({ challengeId, userId: user.id, phone, purpose, code }, dependencies.otpPepper);
        const clientAddress = (request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0] ?? 'unknown').trim();
        const ipHash = await privateDigest(clientAddress, dependencies.ipPepper);
        const challenge = await dependencies.createChallenge({ challengeId, userId: user.id, phone, purpose, digest, ipHash });
        const delivery = await dependencies.gateway.sendOtp({ phoneE164: phone, code, challengeId });
        await dependencies.recordDelivery(challengeId, delivery);
        return response(allowedOrigin, { ...challenge, deliveryStatus: delivery.status });
      }

      if (body.action === 'verify') {
        if (!('challengeId' in body) || typeof body.challengeId !== 'string' || !UUID.test(body.challengeId) || !('code' in body) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new RequestError(400, 'Kode verifikasi tidak valid.');
        const context = await dependencies.getChallengeContext(body.challengeId, user.id);
        if (!context) throw new RequestError(400, 'Challenge tidak valid.');
        const digest = await otpDigest({ challengeId: body.challengeId, userId: user.id, phone: context.phone, purpose: context.purpose, code: body.code }, dependencies.otpPepper);
        const result = await dependencies.verifyChallenge(body.challengeId, user.id, digest);
        return response(allowedOrigin, result);
      }

      throw new RequestError(400, 'Aksi tidak valid.');
    } catch (error) {
      if (error instanceof RequestError) return response(allowedOrigin, { error: error.message }, error.status);
      return response(allowedOrigin, { error: 'Layanan OTP belum dapat memproses permintaan.' }, 503);
    }
  };
}
