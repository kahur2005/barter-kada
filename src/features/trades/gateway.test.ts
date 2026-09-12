import { describe, expect, it, vi } from 'vitest';
import { createSupabaseTradeGateway } from './gateway';

const room = {
  id: 'b1000000-0000-4000-8000-000000000001', conversationId: 'b2000000-0000-4000-8000-000000000002', lifecycle: 'negotiating', revision: 2, acceptedRevision: null, rowVersion: 3,
  actor: { id: 'b3000000-0000-4000-8000-000000000003', name: 'Rina' }, counterpart: { id: 'b4000000-0000-4000-8000-000000000004', name: 'Dita' },
  ownItems: [{ id: 'b5000000-0000-4000-8000-000000000005', offeredBy: 'b3000000-0000-4000-8000-000000000003', source: 'direct', listingId: null, name: 'Jaket denim', details: 'Noda kecil', quantity: 1, photos: [{ bucket: 'chat-media', path: 'rina/jaket.webp' }] }],
  counterpartItems: [{ id: 'b6000000-0000-4000-8000-000000000006', offeredBy: 'b4000000-0000-4000-8000-000000000004', source: 'listing', listingId: 'b7000000-0000-4000-8000-000000000007', name: 'Rak buku', details: 'Ada goresan', quantity: 1, photos: [{ bucket: 'listing-media', path: 'dita/rak.webp' }] }],
  topup: null, readiness: { actor: false, counterpart: true }, approvals: { actor: false, counterpart: false }, receipts: { actorReceived: false, counterpartReceived: false }, cancellationReason: null, updatedAt: '2026-09-12T02:00:00.000Z',
};

describe('Supabase trade gateway', () => {
  it('sends expected revision and idempotency keys for revision and consent commands', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const gateway = createSupabaseTradeGateway({ rpc, storage: { from: vi.fn(() => ({ createSignedUrls: vi.fn(async (paths: string[]) => ({ data: paths.map(path => ({ signedUrl: `https://signed/${path}` })), error: null })) })) } } as never);
    await gateway.revise(room.id, 2, [{ clientId: 'local-1', source: 'listing', listingId: 'b7000000-0000-4000-8000-000000000007' }], null, 'Mengganti barang', 'b8000000-0000-4000-8000-000000000008');
    await gateway.markReady(room.id, 3, 'b9000000-0000-4000-8000-000000000009');
    expect(rpc).toHaveBeenNthCalledWith(1, 'revise_trade', expect.objectContaining({ p_expected_revision: 2, p_idempotency_key: 'b8000000-0000-4000-8000-000000000008' }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'mark_trade_ready', { p_transaction_id: room.id, p_expected_revision: 3, p_idempotency_key: 'b9000000-0000-4000-8000-000000000009' });
  });

  it('signs immutable item snapshots with bucket-specific lifetimes', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const listingSign = vi.fn().mockResolvedValue({ data: [{ signedUrl: 'https://signed/listing' }], error: null });
    const chatSign = vi.fn().mockResolvedValue({ data: [{ signedUrl: 'https://signed/chat' }], error: null });
    const gateway = createSupabaseTradeGateway({ rpc, storage: { from: vi.fn((bucket: string) => ({ createSignedUrls: bucket === 'chat-media' ? chatSign : listingSign })) } } as never);
    const result = await gateway.get(room.id);
    expect(listingSign).toHaveBeenCalledWith(['dita/rak.webp'], 300);
    expect(chatSign).toHaveBeenCalledWith(['rina/jaket.webp'], 60);
    expect(result.ownItems[0].photos[0].url).toBe('https://signed/chat');
  });

  it('sends a scoped admin-help request without changing the trade state client-side', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'b8000000-0000-4000-8000-000000000008', status: 'open' }, error: null });
    const gateway = createSupabaseTradeGateway({ rpc } as never);
    await gateway.requestAdminHelp?.(room.id, 'Pihak lain belum mengonfirmasi penerimaan barang.');
    expect(rpc).toHaveBeenCalledWith('request_admin_help', { p_target_type: 'barter', p_target_id: room.id, p_description: 'Pihak lain belum mengonfirmasi penerimaan barang.' });
  });
});
