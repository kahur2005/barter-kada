import { describe, expect, it, vi } from 'vitest';
import { createSupabaseOrderGateway } from './gateway';

const room = {
  id: 'b1000000-0000-4000-8000-000000000001', conversationId: 'b2000000-0000-4000-8000-000000000002', listingId: 'b3000000-0000-4000-8000-000000000003', kind: 'sale', lifecycle: 'quoted', revision: 1, acceptedRevision: null, actorRole: 'seller',
  buyer: { id: 'b4000000-0000-4000-8000-000000000004', name: 'Pembeli' }, seller: { id: 'b5000000-0000-4000-8000-000000000005', name: 'Penjual' }, items: [{ id: 'b6000000-0000-4000-8000-000000000006', listingId: 'b3000000-0000-4000-8000-000000000003', variantId: null, name: 'Meja', unit: 'unit', quantity: 1, unitPriceRupiah: '100000', lineTotalRupiah: '100000' }], terms: { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', subtotalRupiah: '100000', totalRupiah: '100000', dpPercent: 0, dpAmountRupiah: '0', dpDeadline: null }, payments: [], fulfillment: { processingAt: null, readyAt: null, handedAt: null, receivedAt: null }, cancellationReason: null, cancellationRequest: null, refundFollowUpRequired: false, updatedAt: '2026-09-12T02:00:00.000Z',
};

describe('Supabase order gateway', () => {
  it('maps immutable quote commands without moving money', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const gateway = createSupabaseOrderGateway({ rpc, channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })) } as never);
    await gateway.createQuote('b2000000-0000-4000-8000-000000000002', [{ quantity: '1' }], { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', dpPercent: 0, dpDeadline: null, reason: 'Ringkasan' }, 'b7000000-0000-4000-8000-000000000007');
    expect(rpc).toHaveBeenCalledWith('create_order_quote', expect.objectContaining({ p_conversation_id: 'b2000000-0000-4000-8000-000000000002', p_idempotency_key: 'b7000000-0000-4000-8000-000000000007', p_shipping_amount: '0' }));
  });

  it('maps cancellation commands to explicit RPCs', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const gateway = createSupabaseOrderGateway({ rpc, channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })) } as never);
    await gateway.cancel(room.id, 1, 'Tidak jadi membeli.', 'b7000000-0000-4000-8000-000000000007');
    await gateway.requestCancellation(room.id, 1, 'Ada perubahan kebutuhan.', 'b8000000-0000-4000-8000-000000000008');
    await gateway.respondCancellation('b9000000-0000-4000-8000-000000000009', 1, true, 'ba000000-0000-4000-8000-000000000010');
    expect(rpc).toHaveBeenNthCalledWith(1, 'cancel_order', expect.objectContaining({ p_order_id: room.id, p_reason: 'Tidak jadi membeli.' }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'request_order_cancellation', expect.objectContaining({ p_order_id: room.id, p_reason: 'Ada perubahan kebutuhan.' }));
    expect(rpc).toHaveBeenNthCalledWith(3, 'respond_order_cancellation', expect.objectContaining({ p_request_id: 'b9000000-0000-4000-8000-000000000009', p_approve: true }));
  });

  it('maps pre-processing amendment commands without treating payment as platform-controlled', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const gateway = createSupabaseOrderGateway({ rpc, channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })) } as never);
    await gateway.proposeAmendment(room.id, 1, [{ quantity: '2' }], { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', dpPercent: 50, dpDeadline: '2026-09-13T02:00:00.000Z', reason: 'Jumlah berubah' }, 'bb000000-0000-4000-8000-000000000011');
    await gateway.acceptAmendment('bc000000-0000-4000-8000-000000000012', 1, 'bd000000-0000-4000-8000-000000000013');
    expect(rpc).toHaveBeenNthCalledWith(1, 'propose_order_amendment', expect.objectContaining({ p_order_id: room.id, p_expected_revision: 1, p_items: [{ quantity: '2' }] }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'accept_order_amendment', expect.objectContaining({ p_amendment_id: 'bc000000-0000-4000-8000-000000000012' }));
  });

  it('maps the explicit offline refund lifecycle', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: room, error: null });
    const gateway = createSupabaseOrderGateway({ rpc, channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })) } as never);
    await gateway.proposeRefund(room.id, 1, '50000', 'Pembatalan disepakati.', 'cancellation', 'be000000-0000-4000-8000-000000000014');
    await gateway.acceptRefund('bf000000-0000-4000-8000-000000000015', 1, 'c0000000-0000-4000-8000-000000000016');
    await gateway.recordRefundSent('bf000000-0000-4000-8000-000000000015', 1, 'Transfer langsung via bank.', 'c1000000-0000-4000-8000-000000000017');
    await gateway.confirmRefundReceived('bf000000-0000-4000-8000-000000000015', 1, 'c2000000-0000-4000-8000-000000000018');
    expect(rpc).toHaveBeenNthCalledWith(1, 'propose_refund', expect.objectContaining({ p_amount_rupiah: '50000', p_basis: 'cancellation' }));
    expect(rpc).toHaveBeenNthCalledWith(4, 'confirm_refund_received', expect.objectContaining({ p_refund_request_id: 'bf000000-0000-4000-8000-000000000015' }));
  });

  it('sends a scoped admin-help request for a waiting handover', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'b8000000-0000-4000-8000-000000000008', status: 'open' }, error: null });
    const gateway = createSupabaseOrderGateway({ rpc } as never);
    await gateway.requestAdminHelp?.(room.id, 'Pembeli belum merespons setelah penyerahan barang.');
    expect(rpc).toHaveBeenCalledWith('request_admin_help', { p_target_type: 'order', p_target_id: room.id, p_description: 'Pembeli belum merespons setelah penyerahan barang.' });
  });
});
