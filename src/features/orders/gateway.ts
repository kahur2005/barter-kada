import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { OrderItemInput, OrderQuoteInput, OrderRoom } from './types';

const itemSchema = z.object({ id: z.string().uuid(), listingId: z.string().uuid(), variantId: z.string().uuid().nullable(), name: z.string(), unit: z.string(), quantity: z.number().int().positive(), unitPriceRupiah: z.string(), lineTotalRupiah: z.string() });
const roomSchema: z.ZodType<OrderRoom> = z.object({
  id: z.string().uuid(), conversationId: z.string().uuid(), listingId: z.string().uuid(), kind: z.enum(['sale', 'free']), lifecycle: z.enum(['quoted', 'confirmed', 'awaiting_dp', 'processing', 'ready', 'awaiting_receipt', 'completed', 'cancelled']), revision: z.number().int().positive(), acceptedRevision: z.number().int().positive().nullable(), actorRole: z.enum(['buyer', 'seller']), buyer: z.object({ id: z.string().uuid(), name: z.string() }), seller: z.object({ id: z.string().uuid(), name: z.string() }), items: z.array(itemSchema), terms: z.object({ handoverMethod: z.enum(['pickup', 'meetup', 'delivery']), handoverNote: z.string(), shippingAmountRupiah: z.string(), subtotalRupiah: z.string(), totalRupiah: z.string(), dpPercent: z.number().int().min(0).max(100), dpAmountRupiah: z.string(), dpDeadline: z.string().datetime().nullable() }), payments: z.array(z.object({ kind: z.enum(['dp', 'balance', 'shipping']), amountRupiah: z.string(), state: z.enum(['due', 'acknowledged', 'cancelled']), dueAt: z.string().datetime().nullable() })), fulfillment: z.object({ processingAt: z.string().datetime().nullable(), readyAt: z.string().datetime().nullable(), handedAt: z.string().datetime().nullable(), receivedAt: z.string().datetime().nullable() }), cancellationReason: z.string().nullable(), updatedAt: z.string().datetime(),
});
export interface OrderGateway { get(id: string): Promise<OrderRoom>; createQuote(conversationId: string, items: OrderItemInput[], terms: OrderQuoteInput, key: string): Promise<OrderRoom>; confirm(id: string, revision: number, key: string): Promise<OrderRoom>; acknowledgePayment(id: string, revision: number, kind: 'dp' | 'balance' | 'shipping', key: string): Promise<OrderRoom>; markProcessing(id: string, revision: number, key: string): Promise<OrderRoom>; markReady(id: string, revision: number, key: string): Promise<OrderRoom>; markHandedOver(id: string, revision: number, key: string): Promise<OrderRoom>; confirmReceived(id: string, revision: number, key: string): Promise<OrderRoom>; subscribe(id: string, onCommittedChange: () => void): () => void; }
const failure = () => new Error('Pesanan belum dapat memproses permintaan.');
export function createSupabaseOrderGateway(client: SupabaseClient): OrderGateway {
  async function command(name: string, payload: Record<string, unknown>) { const { data, error } = await client.rpc(name, payload); const parsed = roomSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data; }
  return {
    get: id => command('get_order', { p_order_id: id }),
    createQuote: (conversationId, items, terms, key) => command('create_order_quote', { p_conversation_id: conversationId, p_items: items, p_handover_method: terms.handoverMethod, p_handover_note: terms.handoverNote, p_shipping_amount: terms.shippingAmountRupiah, p_dp_percent: terms.dpPercent, p_dp_deadline: terms.dpDeadline, p_reason: terms.reason, p_idempotency_key: key }),
    confirm: (id, revision, key) => command('confirm_order', { p_order_id: id, p_expected_revision: revision, p_idempotency_key: key }),
    acknowledgePayment: (id, revision, kind, key) => command('acknowledge_order_payment', { p_order_id: id, p_expected_revision: revision, p_kind: kind, p_idempotency_key: key }),
    markProcessing: (id, revision, key) => command('mark_order_processing', { p_order_id: id, p_expected_revision: revision, p_idempotency_key: key }),
    markReady: (id, revision, key) => command('mark_order_ready', { p_order_id: id, p_expected_revision: revision, p_idempotency_key: key }),
    markHandedOver: (id, revision, key) => command('mark_order_handed_over', { p_order_id: id, p_expected_revision: revision, p_idempotency_key: key }),
    confirmReceived: (id, revision, key) => command('confirm_order_received', { p_order_id: id, p_expected_revision: revision, p_idempotency_key: key }),
    subscribe(id, onCommittedChange) { const channel = client.channel(`order:${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${id}` }, onCommittedChange).subscribe(); return () => { void client.removeChannel(channel); }; },
  };
}
