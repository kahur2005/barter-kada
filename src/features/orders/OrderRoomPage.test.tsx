import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderProvider } from './OrderContext';
import { OrderRoomPage } from './OrderRoomPage';
import type { OrderGateway } from './gateway';
import type { OrderRoom } from './types';

const base: OrderRoom = { id: 'c1000000-0000-4000-8000-000000000001', conversationId: 'c2000000-0000-4000-8000-000000000002', listingId: 'c3000000-0000-4000-8000-000000000003', kind: 'sale', lifecycle: 'quoted', revision: 1, acceptedRevision: null, actorRole: 'buyer', buyer: { id: 'c4000000-0000-4000-8000-000000000004', name: 'Pembeli' }, seller: { id: 'c5000000-0000-4000-8000-000000000005', name: 'Penjual' }, items: [{ id: 'c6000000-0000-4000-8000-000000000006', listingId: 'c3000000-0000-4000-8000-000000000003', variantId: null, name: 'Meja', unit: 'unit', quantity: 1, unitPriceRupiah: '100000', lineTotalRupiah: '100000' }], terms: { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', subtotalRupiah: '100000', totalRupiah: '100000', dpPercent: 0, dpAmountRupiah: '0', dpDeadline: null }, payments: [], fulfillment: { processingAt: null, readyAt: null, handedAt: null, receivedAt: null }, cancellationReason: null, cancellationRequest: null, refundFollowUpRequired: false, updatedAt: '2026-09-12T02:00:00.000Z' };
function show(gateway: OrderGateway) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><OrderProvider gateway={gateway}><MemoryRouter initialEntries={[`/orders/${base.id}`]}><Routes><Route path="/orders/:id" element={<OrderRoomPage />} /></Routes></MemoryRouter></OrderProvider></QueryClientProvider>); }

describe('order room', () => {
  it('lets the buyer confirm a quote with an idempotency key', async () => {
    const gateway: OrderGateway = { get: vi.fn().mockResolvedValue(base), createQuote: vi.fn(), confirm: vi.fn().mockResolvedValue({ ...base, lifecycle: 'confirmed', acceptedRevision: 1 }), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), cancel: vi.fn(), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn(), acceptAmendment: vi.fn(), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn(), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(gateway); const user = userEvent.setup();
    expect(await screen.findByText('Status: Menunggu konfirmasi')).toBeVisible();
    await user.click(await screen.findByRole('button', { name: 'Konfirmasi pesanan' }));
    expect(gateway.confirm).toHaveBeenCalledWith(base.id, 1, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('requires a reason before pre-processing cancellation', async () => {
    const gateway: OrderGateway = { get: vi.fn().mockResolvedValue(base), createQuote: vi.fn(), confirm: vi.fn(), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), cancel: vi.fn().mockResolvedValue({ ...base, lifecycle: 'cancelled', cancellationReason: 'Tidak jadi membeli.' }), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn(), acceptAmendment: vi.fn(), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn(), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(gateway); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Batalkan pesanan' }));
    await user.type(screen.getByLabelText('Alasan'), 'Tidak jadi membeli.');
    await user.click(screen.getAllByRole('button', { name: 'Batalkan pesanan' }).at(-1)!);
    expect(gateway.cancel).toHaveBeenCalledWith(base.id, 1, 'Tidak jadi membeli.', expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('lets the buyer review and accept a pending amendment', async () => {
    const amendment = { id: 'c7000000-0000-4000-8000-000000000007', status: 'proposed' as const, baseRevision: 1, proposedRevision: 2, proposerRole: 'seller' as const, reason: 'Stok berubah', createdAt: '2026-09-12T02:00:00.000Z', expiresAt: '2026-09-14T02:00:00.000Z', items: [{ ...base.items[0], quantity: 2 }], terms: { ...base.terms, totalRupiah: '200000', dpAmountRupiah: '0' } };
    const gateway: OrderGateway = { get: vi.fn().mockResolvedValue({ ...base, lifecycle: 'confirmed', acceptedRevision: 1, amendment }), createQuote: vi.fn(), confirm: vi.fn(), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), cancel: vi.fn(), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn(), acceptAmendment: vi.fn().mockResolvedValue({ ...base, lifecycle: 'confirmed', acceptedRevision: 2 }), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn(), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(gateway); const user = userEvent.setup();
    expect(await screen.findByText('Usulan perubahan pesanan')).toBeVisible();
    expect(screen.getByText('Meja × 2')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Setujui perubahan' }));
    expect(gateway.acceptAmendment).toHaveBeenCalledWith(amendment.id, 1, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('separates direct payment and handover status and lets the buyer confirm receipt', async () => {
    const gateway: OrderGateway = { get: vi.fn().mockResolvedValue({ ...base, lifecycle: 'awaiting_receipt', acceptedRevision: 1, terms: { ...base.terms, dpPercent: 50, dpAmountRupiah: '50000', dpDeadline: '2026-09-12T03:00:00.000Z' }, payments: [{ kind: 'dp', amountRupiah: '50000', state: 'acknowledged', dueAt: '2026-09-12T03:00:00.000Z' }, { kind: 'balance', amountRupiah: '50000', state: 'due', dueAt: null }], fulfillment: { processingAt: '2026-09-11T03:00:00.000Z', readyAt: '2026-09-12T02:00:00.000Z', handedAt: '2026-09-12T02:30:00.000Z', receivedAt: null } }), createQuote: vi.fn(), confirm: vi.fn(), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn().mockResolvedValue({ ...base, lifecycle: 'completed' }), cancel: vi.fn(), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn(), acceptAmendment: vi.fn(), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn(), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(gateway); const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Pembayaran langsung' })).toBeVisible();
    expect(screen.getByText('DP · Dikonfirmasi penjual')).toBeVisible();
    expect(screen.getByText('Sisa pelunasan: Rp50.000')).toBeVisible();
    expect(screen.getByText('Tenggat DP: 12 Sep 2026, 10.00 WIB')).toBeVisible();
    expect(screen.getByText('Bertemu langsung')).toBeVisible();
    expect(screen.getByText('Mulai diproses · 11 Sep 2026, 10.00 WIB')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pesanan sudah diterima' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ajukan pembatalan' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pesanan sudah diterima' }));
    expect(gateway.confirmReceived).toHaveBeenCalledWith(base.id, 1, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('lets the seller request admin help after the server-side waiting period', async () => {
    const gateway: OrderGateway = { get: vi.fn().mockResolvedValue({ ...base, actorRole: 'seller', lifecycle: 'awaiting_receipt', acceptedRevision: 1, fulfillment: { ...base.fulfillment, handedAt: '2026-09-09T03:00:00.000Z' }, receiptFollowUp: { triggerAt: '2026-09-09T03:00:00.000Z', helpAvailableAt: '2026-09-12T03:00:00.000Z', canRequestAdminHelp: true, adminHelpRequested: false } }), createQuote: vi.fn(), confirm: vi.fn(), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), cancel: vi.fn(), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn(), acceptAmendment: vi.fn(), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn(), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), requestAdminHelp: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(() => () => undefined) };
    show(gateway); const user = userEvent.setup();
    expect(await screen.findByText(/Transaksi menggantung/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Minta bantuan admin' }));
    await user.type(screen.getByLabelText('Keterangan bantuan'), 'Pembeli belum merespons setelah penyerahan barang.');
    await user.click(screen.getByRole('button', { name: 'Kirim ke admin' }));
    expect(gateway.requestAdminHelp).toHaveBeenCalledWith(base.id, 'Pembeli belum merespons setelah penyerahan barang.');
  });
});
