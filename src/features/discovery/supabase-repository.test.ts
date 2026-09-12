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
it('materializes processed storage paths without accepting private source paths', async () => {
  const path = '00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp';
  const raw = { ...listing, images: [{ path, alt: 'Foto aman' }] };
  const transport = vi.fn<typeof fetch>().mockImplementation(async input => String(input).includes('/rpc/get_listing')
    ? Response.json(raw)
    : Response.json({ signedURL: `/storage/v1/object/sign/listing-media/${path}?token=short-lived` }));
  const client = createClient('https://demo.supabase.co', 'sb_publishable_test', { auth: { storageKey: crypto.randomUUID(), persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: transport } });
  const repo = createSupabaseRepository(client);
  const result = await repo.getListing(listing.id);
  expect(result?.images[0].url).toContain(`/storage/v1/object/sign/listing-media/${path}?token=short-lived`);
  expect(transport.mock.calls.some(call => String(call[0]).includes('/storage/v1/object/sign/listing-media/'))).toBe(true);
});
