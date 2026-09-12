import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { TradeGateway } from './gateway';
import { TradeProvider } from './TradeContext';
import { TradeRoomPage } from './TradeRoomPage';
import type { TradeRoom } from './types';

const transactionId = 'b1000000-0000-4000-8000-000000000001';
const actorId = 'b3000000-0000-4000-8000-000000000003';
const counterpartId = 'b4000000-0000-4000-8000-000000000004';

function tradeRoom(overrides: Partial<TradeRoom> = {}): TradeRoom {
  return {
    id: transactionId,
    conversationId: 'b2000000-0000-4000-8000-000000000002',
    lifecycle: 'negotiating',
    revision: 2,
    acceptedRevision: null,
    rowVersion: 3,
    actor: { id: actorId, name: 'Rina' },
    counterpart: { id: counterpartId, name: 'Dita' },
    ownItems: [{
      id: 'b5000000-0000-4000-8000-000000000005', offeredBy: actorId, source: 'direct', listingId: null,
      name: 'Jaket denim', details: 'Noda kecil di lengan', quantity: 1,
      photos: [{ bucket: 'chat-media', path: 'rina/jaket.webp', url: 'https://signed.test/jaket' }],
    }],
    counterpartItems: [{
      id: 'b6000000-0000-4000-8000-000000000006', offeredBy: counterpartId, source: 'listing',
      listingId: 'b7000000-0000-4000-8000-000000000007', name: 'Rak buku', details: 'Goresan di sisi kanan', quantity: 1,
      photos: [{ bucket: 'listing-media', path: 'dita/rak.webp', url: 'https://signed.test/rak' }],
    }],
    topup: null,
    readiness: { actor: false, counterpart: false },
    approvals: { actor: false, counterpart: false },
    receipts: { actorReceived: false, counterpartReceived: false },
    cancellationReason: null,
    updatedAt: '2026-09-12T02:00:00.000Z',
    ...overrides,
  };
}

function tradeGateway(value: TradeRoom): TradeGateway {
  return {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue(value),
    revise: vi.fn(),
    markReady: vi.fn().mockResolvedValue({ ...value, readiness: { ...value.readiness, actor: true } }),
    approve: vi.fn().mockResolvedValue({ ...value, approvals: { ...value.approvals, actor: true } }),
    confirmReceived: vi.fn().mockResolvedValue({ ...value, receipts: { ...value.receipts, actorReceived: true } }),
    acknowledgeTopup: vi.fn().mockResolvedValue(value),
    cancel: vi.fn().mockResolvedValue({ ...value, lifecycle: 'cancelled' }),
    uploadDirectImage: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
  };
}

function show(value: TradeRoom) {
  const gateway = tradeGateway(value);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <MemoryRouter initialEntries={[`/transactions/${transactionId}`]}>
      <QueryClientProvider client={client}>
        <TradeProvider gateway={gateway}>
          <Routes><Route path="/transactions/:id" element={<TradeRoomPage />} /></Routes>
        </TradeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return gateway;
}

describe('trade room', () => {
  it('marks only the current revision ready', async () => {
    const gateway = show(tradeRoom());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Siap untuk versi 2' }));
    expect(gateway.markReady).toHaveBeenCalledWith(transactionId, 2, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('requires explicit package review before final approval', async () => {
    const gateway = show(tradeRoom({ readiness: { actor: true, counterpart: true } }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Setujui barter' }));
    expect(gateway.approve).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Setujui barter versi 2?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ya, setujui barter' }));
    expect(gateway.approve).toHaveBeenCalledWith(transactionId, 2, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('shows meetup inspection and payee-only settlement actions after agreement', async () => {
    show(tradeRoom({
      lifecycle: 'agreed', acceptedRevision: 2,
      readiness: { actor: true, counterpart: true }, approvals: { actor: true, counterpart: true },
      topup: { payerId: counterpartId, payeeId: actorId, amountRupiah: '50000', acknowledged: false },
    }));
    expect(await screen.findByText(/Periksa barang asli/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Barang sudah diterima' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Uang tambahan diterima' })).toBeVisible();
  });
});
