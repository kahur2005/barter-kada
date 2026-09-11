import { describe, expect, it, vi } from 'vitest';
import { createOpenWaGateway, type FetchLike } from './openwa';

const baseUrl = 'https://wa.example.test';
const apiKey = 'owa_test_operator_key';
const sessionId = '10000000-0000-4000-8000-000000000001';
const input = { phoneE164: '+6281234567890', code: '123456', challengeId: '20000000-0000-4000-8000-000000000002' };

function gateway(fetchImpl: FetchLike) {
  return createOpenWaGateway({ baseUrl, apiKey, sessionId, timeoutMs: 500, fetchImpl });
}

describe('OpenWA OTP gateway', () => {
  it('sends the documented request and reports API acceptance precisely', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response(JSON.stringify({ messageId: '3EB0ABC', timestamp: 1_789_000_000 }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const result = await gateway(fetchImpl).sendOtp(input);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(`${baseUrl}/api/sessions/${sessionId}/messages/send-text`);
    expect(new Headers(init?.headers).get('X-API-Key')).toBe(apiKey);
    expect(JSON.parse(String(init?.body))).toEqual({
      chatId: '6281234567890@c.us',
      text: 'Kode verifikasi Barter: 123456. Berlaku 5 menit. Jangan berikan kode ini kepada siapa pun.',
    });
    expect(result).toEqual({ status: 'accepted', reference: '3EB0ABC' });
    expect(JSON.stringify(result)).not.toMatch(/delivered|verified/i);
  });

  it('maps provider rejection to failed without returning its body', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response(JSON.stringify({ message: `invalid ${input.code} ${apiKey}` }), { status: 400 }));
    const result = await gateway(fetchImpl).sendOtp(input);
    expect(result).toEqual({ status: 'failed', reference: null });
    expect(JSON.stringify(result)).not.toContain(input.code);
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });

  it('maps network uncertainty and malformed success to unknown', async () => {
    const network = vi.fn<FetchLike>().mockRejectedValue(new TypeError(`offline ${input.code}`));
    await expect(gateway(network).sendOtp(input)).resolves.toEqual({ status: 'unknown', reference: null });
    const malformed = vi.fn<FetchLike>().mockResolvedValue(new Response('{}', { status: 201 }));
    await expect(gateway(malformed).sendOtp(input)).resolves.toEqual({ status: 'unknown', reference: null });
  });

  it('rejects unsafe gateway configuration without echoing its key', () => {
    expect(() => createOpenWaGateway({ baseUrl: 'http://remote.example.test', apiKey, sessionId })).toThrow('Konfigurasi OpenWA tidak valid.');
    try { createOpenWaGateway({ baseUrl, apiKey: '', sessionId }); } catch (error) { expect(String(error)).not.toContain(apiKey); }
  });
});
