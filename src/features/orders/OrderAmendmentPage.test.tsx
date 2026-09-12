import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderProvider } from './OrderContext';
import { OrderAmendmentPage } from './OrderAmendmentPage';
import type { OrderGateway } from './gateway';
import type { OrderRoom } from './types';

const room: OrderRoom = { id: 'd1000000-0000-4000-8000-000000000001', conversationId: 'd2000000-0000-4000-8000-000000000002', listingId: 'd3000000-0000-4000-8000-000000000003', kind: 'sale', lifecycle: 'confirmed', revision: 2, acceptedRevision: 2, actorRole: 'seller', buyer: { id: 'd4000000-0000-4000-8000-000000000004', name: 'Pembeli' }, seller: { id: 'd5000000-0000-4000-8000-000000000005', name: 'Penjual' }, items: [{ id: 'd6000000-0000-4000-8000-000000000006', listingId: 'd3000000-0000-4000-8000-000000000003', variantId: null, name: 'Meja', unit: 'unit', quantity: 1, unitPriceRupiah: '100000', lineTotalRupiah: '100000' }], terms: { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', subtotalRupiah: '100000', totalRupiah: '100000', dpPercent: 0, dpAmountRupiah: '0', dpDeadline: null }, payments: [], fulfillment: { processingAt: null, readyAt: null, handedAt: null, receivedAt: null }, cancellationReason: null, cancellationRequest: null, refundFollowUpRequired: false, updatedAt: '2026-09-12T02:00:00.000Z' };
function renderPage(gateway: OrderGateway) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><OrderProvider gateway={gateway}><MemoryRouter initialEntries={[`/orders/${room.id}/amend`]}><Routes><Route path="/orders/:id/amend" element={<OrderAmendmentPage />} /></Routes></MemoryRouter></OrderProvider></QueryClientProvider>); }
function gateway(): OrderGateway { return { get: vi.fn().mockResolvedValue(room), createQuote: vi.fn(), confirm: vi.fn(), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), cancel: vi.fn(), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn().mockResolvedValue(room), acceptAmendment: vi.fn(), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn(), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) }; }

it('shows a before/after-safe amendment form and submits an explicit snapshot', async () => {
  const api = gateway(); renderPage(api); const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: 'Usulkan perubahan pesanan' })).toBeVisible();
  await user.clear(screen.getByLabelText('Jumlah')); await user.type(screen.getByLabelText('Jumlah'), '2');
  await user.type(screen.getByLabelText('Alasan perubahan'), 'Jumlah berubah.');
  await user.click(screen.getByRole('button', { name: 'Kirim usulan perubahan' }));
  expect(api.proposeAmendment).toHaveBeenCalledWith(room.id, 2, [{ variantId: undefined, quantity: '2' }], expect.objectContaining({ reason: 'Jumlah berubah.' }), expect.stringMatching(/^[0-9a-f-]{36}$/));
});
