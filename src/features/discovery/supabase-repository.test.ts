import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { createSupabaseRepository } from './supabase-repository';
import { parseDiscoveryQuery } from './filters';
import { listing } from '../../test/fixtures';

function setup(response: Response) {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(response);
  const client = createClient('https://demo.supabase.co', 'sb_publishable_test', { auth: { storageKey: crypto.randomUUID(), persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: transport } });
  return { repo: createSupabaseRepository(client), transport };
}
it('calls the real RPC transport with filters and strips private additions', async () => {
  const { repo, transport } = setup(Response.json({ items: [{ ...listing, phone: 'private' }], nextCursor: null }));
  const query = parseDiscoveryQuery(new URLSearchParams('q=kursi&radius=10'));
  const result = await repo.searchListings(query);
  expect(result.items).toEqual([listing]);
  expect(String(transport.mock.calls[0][0])).toContain('/rest/v1/rpc/search_listings');
  expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toEqual({ p_query: query });
});
it('preserves null not-found instead of inventing a listing', async () => {
  const { repo, transport } = setup(Response.json(null));
  expect(await repo.getListing(listing.id)).toBeNull();
  expect(transport).toHaveBeenCalledOnce();
});
it('does not fall back to preview data on backend failure', async () => {
  const { repo } = setup(Response.json({ message: 'private internal error', code: '42501' }, { status: 403 }));
  await expect(repo.searchListings(parseDiscoveryQuery(new URLSearchParams()))).rejects.toThrow(/memuat/);
});
it('rejects malformed response data rather than rendering it', async () => {
  const { repo } = setup(Response.json({ items: [{ ...listing, priceMin: -10 }], nextCursor: null }));
  await expect(repo.searchListings(parseDiscoveryQuery(new URLSearchParams()))).rejects.toThrow(/format/);
});
