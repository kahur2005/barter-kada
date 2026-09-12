import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderProvider } from './OrderContext';
import { RefundPage } from './RefundPage';
import type { OrderGateway } from './gateway';
import type { OrderRoom } from './types';

const room: OrderRoom = { id: 'e1000000-0000-4000-8000-000000000001', conversationId: 'e2000000-0000-4000-8000-000000000002', listingId: 'e3000000-0000-4000-8000-000000000003', kind: 'sale', lifecycle: 'cancelled', revision: 2, acceptedRevision: 2, actorRole: 'seller', buyer: { id: 'e4000000-0000-4000-8000-000000000004', name: 'Pembeli' }, seller: { id: 'e5000000-0000-4000-8000-000000000005', name: 'Penjual' }, items: [], terms: { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', subtotalRupiah: '100000', totalRupiah: '100000', dpPercent: 50, dpAmountRupiah: '50000', dpDeadline: null }, payments: [{ kind: 'dp', amountRupiah: '50000', state: 'acknowledged', dueAt: null }], fulfillment: { processingAt: null, readyAt: null, handedAt: null, receivedAt: null }, cancellationReason: 'Batal.', cancellationRequest: null, refundFollowUpRequired: true, refunds: [], settlement: { acknowledgedRupiah: '50000', confirmedRefundRupiah: '0', netReceivedRupiah: '50000', amountStillDueRupiah: '50000', refundCapRupiah: '50000' }, updatedAt: '2026-09-12T02:00:00.000Z' };
function renderPage(gateway: OrderGateway) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><OrderProvider gateway={gateway}><MemoryRouter initialEntries={[`/orders/${room.id}/refund`]}><Routes><Route path="/orders/:id/refund" element={<RefundPage />} /></Routes></MemoryRouter></OrderProvider></QueryClientProvider>); }
function gateway(): OrderGateway { return { get: vi.fn().mockResolvedValue(room), createQuote: vi.fn(), confirm: vi.fn(), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), cancel: vi.fn(), requestCancellation: vi.fn(), respondCancellation: vi.fn(), proposeAmendment: vi.fn(), acceptAmendment: vi.fn(), rejectAmendment: vi.fn(), withdrawAmendment: vi.fn(), proposeRefund: vi.fn().mockResolvedValue(room), acceptRefund: vi.fn(), rejectRefund: vi.fn(), recordRefundSent: vi.fn(), confirmRefundReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) }; }

it('labels refund as direct transfer and caps the proposal at acknowledged payment', async () => {
  const api = gateway(); renderPage(api);
  expect(await screen.findByText(/Maksimal Rp50.000/)).toBeVisible();
  expect(screen.getByText(/Barter tidak menerima atau memindahkan uang/)).toBeVisible();
});
