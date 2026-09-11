export type OtpDelivery = { status: 'accepted' | 'failed' | 'unknown'; reference: string | null };
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type OpenWaConfig = { baseUrl: string; apiKey: string; sessionId: string; timeoutMs?: number; fetchImpl?: FetchLike };

export interface OpenWaGateway {
  sendOtp(input: { phoneE164: string; code: string; challengeId: string }, signal?: AbortSignal): Promise<OtpDelivery>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE = /^\+628[1-9]\d{7,10}$/;

function parseConfig(config: OpenWaConfig) {
  const fail = () => new Error('Konfigurasi OpenWA tidak valid.');
  let baseUrl: URL;

  try {
    baseUrl = new URL(config.baseUrl);
  } catch {
    throw fail();
  }

  const localHttp = baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname);
  const secure = baseUrl.protocol === 'https:' || localHttp;
  const cleanOrigin = baseUrl.username === '' && baseUrl.password === '' && baseUrl.search === '' && baseUrl.hash === '';
  const timeoutMs = config.timeoutMs ?? 8_000;

  if (!secure || !cleanOrigin || !config.apiKey.trim() || !UUID.test(config.sessionId) || timeoutMs < 500 || timeoutMs > 30_000) {
    throw fail();
  }

  return {
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
    apiKey: config.apiKey,
    sessionId: config.sessionId,
    timeoutMs,
    fetchImpl: config.fetchImpl ?? fetch,
  };
}

export function createOpenWaGateway(config: OpenWaConfig): OpenWaGateway {
  const safeConfig = parseConfig(config);

  return {
    async sendOtp(input, signal) {
      if (!PHONE.test(input.phoneE164) || !/^\d{6}$/.test(input.code) || !UUID.test(input.challengeId)) {
        throw new Error('Permintaan OTP tidak valid.');
      }

      const controller = new AbortController();
      const abort = () => controller.abort();
      const timeout = setTimeout(abort, safeConfig.timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });

      try {
        const response = await safeConfig.fetchImpl(
          `${safeConfig.baseUrl}/api/sessions/${encodeURIComponent(safeConfig.sessionId)}/messages/send-text`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': safeConfig.apiKey,
            },
            body: JSON.stringify({
              chatId: `${input.phoneE164.slice(1)}@c.us`,
              text: `Kode verifikasi Barter: ${input.code}. Berlaku 5 menit. Jangan berikan kode ini kepada siapa pun.`,
            }),
            signal: controller.signal,
          },
        );

        if (response.status !== 201) return { status: 'failed', reference: null };

        const payload: unknown = await response.json();
        if (typeof payload !== 'object' || payload === null || !('messageId' in payload) || typeof payload.messageId !== 'string' || payload.messageId.length === 0) {
          return { status: 'unknown', reference: null };
        }

        return { status: 'accepted', reference: payload.messageId };
      } catch {
        return { status: 'unknown', reference: null };
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
      }
    },
  };
}
