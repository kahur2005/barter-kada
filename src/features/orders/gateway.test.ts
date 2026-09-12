import { describe, expect, it, vi } from 'vitest';
import { createSupabaseOrderGateway } from './gateway';

const room = {
  id: 'b1000000-0000-4000-8000-000000000001', conversationId: 'b2000000-0000-4000-8000-000000000002', listingId: 'b3000000-0000-4000-8000-000000000003', kind: 'sale', lifecycle: 'quoted', revision: 1, acceptedRevision: null, actorRole: 'seller',
  buyer: { id: 'b4000000-0000-4000-8000-000000000004', name: 'Pembeli' }, seller: { id: 'b5000000-0000-4000-8000-000000000005', name: 'Penjual' }, items: [{ id: 'b6000000-0000-4000-8000-000000000006', listingId: 'b3000000-0000-4000-8000-000000000003', variantId: null, name: 'Meja', unit: 'unit', quantity: 1, unitPriceRupiah: '100000', lineTotalRupiah: '100000' }], terms: { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', subtotalRupiah: '100000', totalRupiah: '100000', dpPercent: 0, dpAmountRupiah: '0', dpDeadline: null }, payments: [], fulfillment: { processingAt: null, readyAt: null, handedAt: null, receivedAt: null }, cancellationReason: null, updatedAt: '2026-09-12T02:00:00.000Z',
};

describe('Supabase order gateway', () => {
  it('maps immutable quote commands without moving money', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const gateway = createSupabaseOrderGateway({ rpc, channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })) } as never);
    await gateway.createQuote('b2000000-0000-4000-8000-000000000002', [{ quantity: '1' }], { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', dpPercent: 0, dpDeadline: null, reason: 'Ringkasan' }, 'b7000000-0000-4000-8000-000000000007');
    expect(rpc).toHaveBeenCalledWith('create_order_quote', expect.objectContaining({ p_conversation_id: 'b2000000-0000-4000-8000-000000000002', p_idempotency_key: 'b7000000-0000-4000-8000-000000000007', p_shipping_amount: '0' }));
  });
});
