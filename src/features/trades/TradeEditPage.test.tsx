import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Providers } from '../../app/providers';
import { createPreviewRepository } from '../discovery/preview-repository';
import { demoListings, demoStores } from '../discovery/fixtures';
import type { AuthGateway } from '../auth/types';
import type { ListingGateway } from '../listings/gateway';
import type { TradeGateway } from './gateway';
import type { TradeRoom } from './types';
import { TradeEditPage } from './TradeEditPage';

const actorId = 'd1000000-0000-4000-8000-000000000001';
const counterpartId = 'd2000000-0000-4000-8000-000000000002';
const tradeId = 'd4000000-0000-4000-8000-000000000004';
const conversationId = 'd3000000-0000-4000-8000-000000000003';
const assetId = 'd5000000-0000-4000-8000-000000000005';
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: actorId, email: 'rina@example.test' }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const listings: ListingGateway = { saveDraft: vi.fn(), publish: vi.fn(), getMine: vi.fn(), uploadImage: vi.fn(), archive: vi.fn(), listMine: vi.fn().mockResolvedValue({ items: [{ listingId: 'd6000000-0000-4000-8000-000000000006', title: 'Tas kerja', lifecycle: 'active', version: 1, reserved: false, updatedAt: '2026-09-12T01:00:00.000Z' }], activeCount: 1, activeLimit: 10 }) };
function room(): TradeRoom { return { id: tradeId, conversationId, lifecycle: 'negotiating', revision: 2, acceptedRevision: null, rowVersion: 3, actor: { id: actorId, name: 'Rina' }, counterpart: { id: counterpartId, name: 'Budi' }, ownItems: [{ id: 'd7000000-0000-4000-8000-000000000007', offeredBy: actorId, source: 'direct', listingId: null, name: 'Kursi', details: 'Kayu kokoh', quantity: 1, photos: [{ assetId, bucket: 'chat-media', path: `${conversationId}/${assetId}.webp` }] }], counterpartItems: [{ id: 'd8000000-0000-4000-8000-000000000008', offeredBy: counterpartId, source: 'listing', listingId: demoListings[0].id, name: 'Buku', details: 'Baik', quantity: 1, photos: [{ bucket: 'listing-media', path: 'x.webp' }] }], topup: null, readiness: { actor: false, counterpart: false }, approvals: { actor: false, counterpart: false }, receipts: { actorReceived: false, counterpartReceived: false }, cancellationReason: null, updatedAt: '2026-09-12T01:00:00.000Z' }; }
function show(trade: TradeGateway) { render(<MemoryRouter initialEntries={[`/transactions/${tradeId}/edit`]}><Providers repository={createPreviewRepository(demoListings, demoStores)} authGateway={auth} onboardingGateway={null} listingGateway={listings} chatGateway={null} tradeGateway={trade}><Routes><Route path="/transactions/:id/edit" element={<TradeEditPage />} /></Routes></Providers></MemoryRouter>); }

describe('trade revision editor', () => {
  it('loads the private package and requires a reason before revising', async () => {
    const trade: TradeGateway = { get: vi.fn().mockResolvedValue(room()), revise: vi.fn(), markReady: vi.fn(), approve: vi.fn(), confirmReceived: vi.fn(), acknowledgeTopup: vi.fn(), cancel: vi.fn(), create: vi.fn(), uploadDirectImage: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(trade);
    await screen.findByRole('heading', { name: 'Ubah penawaranmu' });
    expect(screen.getByDisplayValue('Kursi')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Simpan versi baru' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Jelaskan perubahan');
    expect(trade.revise).not.toHaveBeenCalled();
  });

  it('submits the current revision and preserves private asset ids', async () => {
    const next = { ...room(), revision: 3 };
    const trade: TradeGateway = { get: vi.fn().mockResolvedValue(room()), revise: vi.fn().mockResolvedValue(next), markReady: vi.fn(), approve: vi.fn(), confirmReceived: vi.fn(), acknowledgeTopup: vi.fn(), cancel: vi.fn(), create: vi.fn(), uploadDirectImage: vi.fn(), subscribe: vi.fn(() => () => undefined) };
    show(trade); const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Ubah penawaranmu' });
    await user.type(screen.getByLabelText('Alasan perubahan'), 'Foto dan detail sudah diperbarui');
    await user.click(screen.getByRole('button', { name: 'Simpan versi baru' }));
    await waitFor(() => expect(trade.revise).toHaveBeenCalledWith(tradeId, 2, [{ clientId: expect.any(String), source: 'direct', name: 'Kursi', details: 'Kayu kokoh', quantity: '1', assetIds: [assetId] }], null, 'Foto dan detail sudah diperbarui', expect.stringMatching(/^[0-9a-f-]{36}$/)));
  });
});
