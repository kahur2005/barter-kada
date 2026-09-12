import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderProvider } from './OrderContext';
import { OrderRoomPage } from './OrderRoomPage';
import type { OrderGateway } from './gateway';
import type { OrderRoom } from './types';

const base: OrderRoom = { id: 'c1000000-0000-4000-8000-000000000001', conversationId: 'c2000000-0000-4000-8000-000000000002', listingId: 'c3000000-0000-4000-8000-000000000003', kind: 'sale', lifecycle: 'quoted', revision: 1, acceptedRevision: null, actorRole: 'buyer', buyer: { id: 'c4000000-0000-4000-8000-000000000004', name: 'Pembeli' }, seller: { id: 'c5000000-0000-4000-8000-000000000005', name: 'Penjual' }, items: [{ id: 'c6000000-0000-4000-8000-000000000006', listingId: 'c3000000-0000-4000-8000-000000000003', variantId: null, name: 'Meja', unit: 'unit', quantity: 1, unitPriceRupiah: '100000', lineTotalRupiah: '100000' }], terms: { handoverMethod: 'meetup', handoverNote: 'Lobi', shippingAmountRupiah: '0', subtotalRupiah: '100000', totalRupiah: '100000', dpPercent: 0, dpAmountRupiah: '0', dpDeadline: null }, payments: [], fulfillment: { processingAt: null, readyAt: null, handedAt: null, receivedAt: null }, cancellationReason: null, updatedAt: '2026-09-12T02:00:00.000Z' };
function show(gateway: OrderGateway) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><OrderProvider gateway={gateway}><MemoryRouter initialEntries={[`/orders/${base.id}`]}><Routes><Route path="/orders/:id" element={<OrderRoomPage />} /></Routes></MemoryRouter></OrderProvider></QueryClientProvider>); }

describe('order room', () => {
  it('lets the buyer confirm a quote with an idempotency key', async () => {
    const gateway: OrderGateway = { get: vi.fn().mockResolvedValue(base), createQuote: vi.fn(), confirm: vi.fn().mockResolvedValue({ ...base, lifecycle: 'confirmed', acceptedRevision: 1 }), acknowledgePayment: vi.fn(), markProcessing: vi.fn(), markReady: vi.fn(), markHandedOver: vi.fn(), confirmReceived: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(gateway); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Konfirmasi pesanan' }));
    expect(gateway.confirm).toHaveBeenCalledWith(base.id, 1, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });
});
