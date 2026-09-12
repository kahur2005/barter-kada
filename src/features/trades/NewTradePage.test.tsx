import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Providers } from '../../app/providers';
import { createPreviewRepository } from '../discovery/preview-repository';
import { demoListings, demoStores } from '../discovery/fixtures';
import type { AuthGateway } from '../auth/types';
import type { ListingGateway } from '../listings/gateway';
import type { ChatGateway } from '../chat/gateway';
import type { TradeGateway } from './gateway';
import { NewTradePage } from './NewTradePage';

const actorId = 'd1000000-0000-4000-8000-000000000001';
const targetId = demoListings[0].id;
const ownListingId = 'd2000000-0000-4000-8000-000000000002';
const auth: AuthGateway = {
  getSession: vi.fn().mockResolvedValue({ userId: actorId, email: 'rina@example.test' }), subscribe: vi.fn(() => () => undefined),
  signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(),
};
const listings: ListingGateway = {
  saveDraft: vi.fn(), publish: vi.fn(), getMine: vi.fn(), uploadImage: vi.fn(), archive: vi.fn(),
  listMine: vi.fn().mockResolvedValue({ items: [{ listingId: ownListingId, title: 'Jaket denim milikmu', lifecycle: 'active', version: 1, reserved: false, updatedAt: '2026-09-12T01:00:00.000Z' }], activeCount: 1, activeLimit: 10 }),
};
const chat: ChatGateway = {
  openConversation: vi.fn().mockResolvedValue('d3000000-0000-4000-8000-000000000003'), listConversations: vi.fn(), listMessages: vi.fn(), sendText: vi.fn(), sendImages: vi.fn(), markRead: vi.fn(), blockUser: vi.fn(), unblockUser: vi.fn(), subscribe: vi.fn(() => () => undefined),
};
function gateway(): TradeGateway { return {
  create: vi.fn().mockResolvedValue({ id: 'd4000000-0000-4000-8000-000000000004' }), get: vi.fn(), revise: vi.fn(), markReady: vi.fn(), approve: vi.fn(), confirmReceived: vi.fn(), acknowledgeTopup: vi.fn(), cancel: vi.fn(), uploadDirectImage: vi.fn(), subscribe: vi.fn(() => () => undefined),
} as unknown as TradeGateway; }
function show(trade = gateway()) {
  render(<MemoryRouter initialEntries={[`/barter/new/${targetId}`]}><Providers repository={createPreviewRepository(demoListings, demoStores)} authGateway={auth} onboardingGateway={null} listingGateway={listings} chatGateway={chat} tradeGateway={trade}><Routes><Route path="/barter/new/:listingId" element={<NewTradePage />} /></Routes></Providers></MemoryRouter>);
  return trade;
}

describe('new trade proposal', () => {
  it('does not submit an incomplete direct item', async () => {
    const trade = show(); const user = userEvent.setup();
    await screen.findByRole('heading', { name: /Ajukan barter/ });
    await user.click(screen.getByRole('button', { name: 'Buat tawaran barter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Lengkapi setiap barang');
    expect(trade.create).not.toHaveBeenCalled();
  });

  it('creates a listing-linked package with an explicit top-up direction', async () => {
    const trade = show(); const user = userEvent.setup();
    await screen.findByRole('heading', { name: /Ajukan barter/ });
    await user.click(screen.getByLabelText('Pilih listing milikmu'));
    await user.selectOptions(screen.getByLabelText('Listing yang ditawarkan'), ownListingId);
    await user.selectOptions(screen.getByLabelText('Tambahan uang'), 'actor');
    await user.type(screen.getByLabelText('Nominal tambahan'), '50000');
    await user.click(screen.getByRole('button', { name: 'Buat tawaran barter' }));
    await waitFor(() => expect(trade.create).toHaveBeenCalledWith(targetId, [{ clientId: expect.any(String), source: 'listing', listingId: ownListingId }], { payerId: actorId, amountRupiah: '50000' }, expect.stringMatching(/^[0-9a-f-]{36}$/)));
  });
});
