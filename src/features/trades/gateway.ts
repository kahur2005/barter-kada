import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { TradeItemInput, TradeRoom, TradeTopupInput } from './types';

const photoSchema = z.object({ assetId: z.string().uuid().optional(), bucket: z.enum(['listing-media', 'chat-media']), path: z.string().min(1), url: z.string().url().optional() });
const itemSchema = z.object({
  id: z.string().uuid(), offeredBy: z.string().uuid(), source: z.enum(['listing', 'direct']), listingId: z.string().uuid().nullable(),
  name: z.string(), details: z.string(), quantity: z.number().int().positive(), photos: z.array(photoSchema).min(1).max(4),
});
const roomSchema: z.ZodType<TradeRoom> = z.object({
  id: z.string().uuid(), conversationId: z.string().uuid(), lifecycle: z.enum(['negotiating', 'agreed', 'completed', 'cancelled']),
  revision: z.number().int().positive(), acceptedRevision: z.number().int().positive().nullable(), rowVersion: z.number().int().nonnegative(),
  actor: z.object({ id: z.string().uuid(), name: z.string() }), counterpart: z.object({ id: z.string().uuid(), name: z.string() }),
  ownItems: z.array(itemSchema), counterpartItems: z.array(itemSchema),
  topup: z.object({ payerId: z.string().uuid(), payeeId: z.string().uuid(), amountRupiah: z.string().regex(/^[1-9][0-9]*$/), acknowledged: z.boolean() }).nullable(),
  readiness: z.object({ actor: z.boolean(), counterpart: z.boolean() }), approvals: z.object({ actor: z.boolean(), counterpart: z.boolean() }),
  receipts: z.object({ actorReceived: z.boolean(), counterpartReceived: z.boolean() }), receiptFollowUp: z.object({ triggerAt: z.string().datetime(), helpAvailableAt: z.string().datetime(), canRequestAdminHelp: z.boolean(), adminHelpRequested: z.boolean() }).nullable().optional(), cancellationReason: z.string().nullable(), updatedAt: z.string().datetime(),
});

export interface TradeGateway {
  create(listingId: string, items: TradeItemInput[], topup: TradeTopupInput, idempotencyKey: string): Promise<TradeRoom>;
  get(transactionId: string): Promise<TradeRoom>;
  revise(transactionId: string, expectedRevision: number, items: TradeItemInput[], topup: TradeTopupInput, reason: string, idempotencyKey: string): Promise<TradeRoom>;
  markReady(transactionId: string, expectedRevision: number, idempotencyKey: string): Promise<TradeRoom>;
  approve(transactionId: string, expectedRevision: number, idempotencyKey: string): Promise<TradeRoom>;
  confirmReceived(transactionId: string, expectedRevision: number, idempotencyKey: string): Promise<TradeRoom>;
  acknowledgeTopup(transactionId: string, expectedRevision: number, idempotencyKey: string): Promise<TradeRoom>;
  cancel(transactionId: string, expectedRevision: number, reason: string, idempotencyKey: string): Promise<TradeRoom>;
  requestAdminHelp?(transactionId: string, description: string): Promise<void>;
  uploadDirectImage(conversationId: string, file: File, onProgress: (percent: number) => void): Promise<string>;
  subscribe(transactionId: string, onCommittedChange: () => void): () => void;
}

const failure = () => new Error('Ruang barter belum dapat memproses permintaan.');
export function createSupabaseTradeGateway(client: SupabaseClient): TradeGateway {
  async function parseAndSign(data: unknown, error: unknown): Promise<TradeRoom> {
    const parsed = roomSchema.safeParse(data); if (error || !parsed.success) throw failure();
    const result = parsed.data;
    const allItems = [...result.ownItems, ...result.counterpartItems];
    for (const bucket of ['listing-media', 'chat-media'] as const) {
      const paths = [...new Set(allItems.flatMap(item => item.photos.filter(photo => photo.bucket === bucket).map(photo => photo.path)))];
      if (!paths.length) continue;
      const { data: signed, error: signError } = await client.storage.from(bucket).createSignedUrls(paths, bucket === 'chat-media' ? 60 : 300);
      if (signError || !signed || signed.length !== paths.length || signed.some(item => !item.signedUrl)) throw failure();
      const urls = new Map(paths.map((path, index) => [path, signed[index]?.signedUrl ?? '']));
      for (const item of allItems) for (const photo of item.photos) if (photo.bucket === bucket) photo.url = urls.get(photo.path);
    }
    return result;
  }
  async function command(name: string, payload: Record<string, unknown>): Promise<TradeRoom> {
    const { data, error } = await client.rpc(name, payload); return parseAndSign(data, error);
  }
  return {
    create: (listingId, items, topup, idempotencyKey) => command('create_trade', { p_listing_id: listingId, p_items: items, p_topup: topup, p_idempotency_key: idempotencyKey }),
    async get(transactionId) { const { data, error } = await client.rpc('get_trade', { p_transaction_id: transactionId }); return parseAndSign(data, error); },
    revise: (transactionId, expectedRevision, items, topup, reason, idempotencyKey) => command('revise_trade', { p_transaction_id: transactionId, p_expected_revision: expectedRevision, p_items: items, p_topup: topup, p_reason: reason, p_idempotency_key: idempotencyKey }),
    markReady: (transactionId, expectedRevision, idempotencyKey) => command('mark_trade_ready', { p_transaction_id: transactionId, p_expected_revision: expectedRevision, p_idempotency_key: idempotencyKey }),
    approve: (transactionId, expectedRevision, idempotencyKey) => command('approve_trade', { p_transaction_id: transactionId, p_expected_revision: expectedRevision, p_idempotency_key: idempotencyKey }),
    confirmReceived: (transactionId, expectedRevision, idempotencyKey) => command('confirm_trade_received', { p_transaction_id: transactionId, p_expected_revision: expectedRevision, p_idempotency_key: idempotencyKey }),
    acknowledgeTopup: (transactionId, expectedRevision, idempotencyKey) => command('acknowledge_trade_topup', { p_transaction_id: transactionId, p_expected_revision: expectedRevision, p_idempotency_key: idempotencyKey }),
    cancel: (transactionId, expectedRevision, reason, idempotencyKey) => command('cancel_trade', { p_transaction_id: transactionId, p_expected_revision: expectedRevision, p_reason: reason, p_idempotency_key: idempotencyKey }),
    async requestAdminHelp(transactionId, description) {
      const { data, error } = await client.rpc('request_admin_help', { p_target_type: 'barter', p_target_id: transactionId, p_description: description });
      const parsed = z.object({ id: z.string().uuid(), status: z.literal('open') }).safeParse(data);
      if (error || !parsed.success) throw failure();
    },
    async uploadDirectImage(conversationId, file, onProgress) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) throw failure();
      const { data, error } = await client.rpc('reserve_chat_asset', { p_conversation_id: conversationId, p_mime_type: file.type, p_byte_size: file.size });
      const reservation = z.object({ assetId: z.string().uuid(), quarantinePath: z.string().min(1) }).safeParse(data);
      if (error || !reservation.success) throw failure(); onProgress(20);
      const { error: uploadError } = await client.storage.from('chat-quarantine').upload(reservation.data.quarantinePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw failure(); onProgress(60);
      const { data: sessionData } = await client.auth.getSession(); const token = sessionData.session?.access_token;
      if (!token) throw failure();
      const response = await fetch('/api/chat-media', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: reservation.data.assetId }) });
      if (!response.ok) throw failure(); const processed = await response.json() as Record<string, unknown>;
      if (processed.assetId !== reservation.data.assetId) throw failure(); onProgress(100); return reservation.data.assetId;
    },
    subscribe(transactionId, onCommittedChange) {
      const channel = client.channel(`transaction:${transactionId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transaction_events', filter: `transaction_id=eq.${transactionId}` }, onCommittedChange).subscribe();
      return () => { void client.removeChannel(channel); };
    },
  };
}
