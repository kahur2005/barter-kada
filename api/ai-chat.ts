import type { IncomingMessage, ServerResponse } from 'node:http';

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_TOTAL_LENGTH = 12_000;
const SUPPORT_SYSTEM_PROMPT = [
  'Kamu adalah asisten bantuan pelanggan Barter, marketplace barter lokal Indonesia.',
  'Jawab dalam bahasa Indonesia yang ramah, ringkas, dan mudah dipahami.',
  'Bantu pengguna memahami cara mencari listing, memasang listing, barter, pesan, pesanan, dan keamanan.',
  'Jangan mengaku bisa melihat akun, transaksi, saldo, atau status pesanan pengguna.',
  'Jika pertanyaan membutuhkan tindakan pada akun atau sengketa, arahkan pengguna untuk menghubungi tim bantuan melalui kanal resmi.',
  'ATURAN FORMAT WAJIB: Balas hanya dengan teks polos. Dilarang menggunakan Markdown apa pun, termasuk tanda bintang, garis bawah, pagar judul, backtick, tautan Markdown, tabel, atau blok kode. Untuk daftar gunakan angka biasa seperti 1. atau tanda hubung biasa. Untuk penekanan gunakan HURUF KAPITAL atau tanda kutip.',
].join(' ');

export type CustomerSupportMessage = { role: 'user' | 'assistant'; content: string };

export type AliceChatDependencies = {
  apiUrl: string;
  apiKey: string;
  model: string;
  reasoningEffort: 'low' | 'high' | 'max';
  maxTokens: number;
  fetch: typeof fetch;
};

type ApiResult = { status: number; body: Record<string, string> };

function isMessages(value: unknown): value is CustomerSupportMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return false;
  let totalLength = 0;
  for (const message of value) {
    if (!message || typeof message !== 'object') return false;
    const candidate = message as Record<string, unknown>;
    if (candidate.role !== 'user' && candidate.role !== 'assistant') return false;
    if (typeof candidate.content !== 'string') return false;
    const content = candidate.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) return false;
    totalLength += content.length;
    if (totalLength > MAX_TOTAL_LENGTH) return false;
  }
  return value.some(message => message.role === 'user');
}

function completionsUrl(apiUrl: string): string {
  const normalized = apiUrl.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  if (normalized.endsWith('/v1')) return `${normalized}/chat/completions`;
  return `${normalized}/v1/chat/completions`;
}

function extractText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!Array.isArray(value)) return null;
  const text = value
    .filter(part => part && typeof part === 'object' && (part as Record<string, unknown>).type === 'text')
    .map(part => (part as Record<string, unknown>).text)
    .filter((part): part is string => typeof part === 'string')
    .join('')
    .trim();
  return text || null;
}

function normalizePlainText(value: string): string {
  return value
    .replace(/```[^\n]*\n?/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[*+]\s+/gm, '- ')
    .replace(/^\s*([-*_]){3,}\s*$/gm, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/~~(.*?)~~/gs, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/[|*_]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function forwardCustomerSupportChat(
  input: { messages: unknown },
  dependencies: AliceChatDependencies,
): Promise<ApiResult> {
  if (!isMessages(input.messages)) return { status: 400, body: { error: 'MESSAGES_INVALID' } };
  if (!dependencies.apiUrl.trim() || !dependencies.apiKey.trim() || !dependencies.model.trim()) {
    return { status: 503, body: { error: 'AI_SERVICE_NOT_CONFIGURED' } };
  }

  try {
    const response = await dependencies.fetch(completionsUrl(dependencies.apiUrl), {
      method: 'POST',
      headers: { Authorization: `Bearer ${dependencies.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: dependencies.model,
        messages: [{ role: 'system', content: SUPPORT_SYSTEM_PROMPT }, ...input.messages.map(message => ({ ...message, content: message.content.trim() }))],
        reasoning_effort: dependencies.reasoningEffort,
        max_tokens: dependencies.maxTokens,
      }),
    });
    if (!response.ok) return { status: 502, body: { error: 'AI_PROVIDER_UNAVAILABLE' } };
    const data = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const rawMessage = extractText(data.choices?.[0]?.message?.content);
    const message = rawMessage ? normalizePlainText(rawMessage) : null;
    return message ? { status: 200, body: { message } } : { status: 502, body: { error: 'AI_RESPONSE_INVALID' } };
  } catch {
    return { status: 502, body: { error: 'AI_PROVIDER_UNAVAILABLE' } };
  }
}

function createDependencies(): AliceChatDependencies {
  return {
    apiUrl: process.env.ALICE_API_URL ?? '',
    apiKey: process.env.ALICE_API_KEY ?? '',
    model: process.env.ALICE_MODEL ?? 'zai-org/GLM-5.3-Flash',
    reasoningEffort: process.env.ALICE_REASONING_EFFORT === 'high' || process.env.ALICE_REASONING_EFFORT === 'max' ? process.env.ALICE_REASONING_EFFORT : 'low',
    maxTokens: Math.min(Math.max(Number.parseInt(process.env.ALICE_MAX_TOKENS ?? '512', 10) || 512, 64), 4_096),
    fetch,
  };
}

async function readJson(request: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === 'object') return request.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += value.byteLength;
    if (length > 32_768) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.setHeader('Allow', 'POST');
    response.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
    return;
  }
  try {
    const body = await readJson(request);
    const result = await forwardCustomerSupportChat({ messages: body.messages }, createDependencies());
    response.statusCode = result.status;
    response.end(JSON.stringify(result.body));
  } catch {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: 'REQUEST_INVALID' }));
  }
}
