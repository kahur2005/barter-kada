import { expect, it } from 'vitest';
import { listing } from '../../test/fixtures';
import { listingSchema } from './types';
import { parseDiscoveryQuery } from './filters';
import { createPreviewRepository } from './preview-repository';
import { demoListings } from './fixtures';

const a = listingSchema.parse(listing);
const b = { ...a, id: '10000000-0000-4000-8000-000000000002', title: 'Nasi kotak', category: 'food', modes: ['sale'] as const, priceMin: '10000', priceMax: '10000' };
const query = parseDiscoveryQuery(new URLSearchParams());

it('uses relevant stock photos for the preview selling and barter posts', () => {
  const demoImageUrls = new Map(demoListings.map(item => [item.title, item.images[0]?.url]));
  expect(demoImageUrls.get('Kursi kayu bekas')).toMatch(/^https:\/\//);
  expect(demoImageUrls.get('Nasi kotak untuk Jumat bersama')).toMatch(/^https:\/\//);
  expect(demoImageUrls.get('Jaket denim ukuran M')).toMatch(/^https:\/\//);
  expect(demoImageUrls.get('Sepeda kota untuk perjalanan dekat')).toMatch(/^https:\/\//);
});

it('exposes the synthetic area choices only through the explicit preview repository', async () => {
  const repo = createPreviewRepository([a], []);
  expect(await repo.listAreas()).toEqual([
    { areaId: 'depok', name: 'Depok' },
    { areaId: 'jakarta-selatan', name: 'Jakarta Selatan' },
    { areaId: 'bogor', name: 'Bogor' },
    { areaId: 'bekasi', name: 'Bekasi' },
    { areaId: 'tangerang', name: 'Tangerang' },
  ]);
});

it('combines query, mode, category, price and approximate radius', async () => {
  const repo = createPreviewRepository([a, { ...b, modes: [...b.modes] }], []);
  expect((await repo.searchListings({ ...query, query: 'kursi', mode: 'barter', category: 'home', minPrice: '100000', maxPrice: '200000' })).items.map(i => i.id)).toEqual([a.id]);
  expect((await repo.searchListings({ ...query, query: 'kursi', maxPrice: '10000' })).items).toEqual([]);
  expect((await repo.searchListings({ ...query, radiusKm: 1 })).items).toEqual([]);
});
it('pages deterministically without repeating items or accepting a cursor for changed filters', async () => {
  const entries = Array.from({ length: 25 }, (_, i) => ({ ...a, id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}` }));
  const repo = createPreviewRepository(entries, []);
  const first = await repo.searchListings(query);
  expect(first.items).toHaveLength(20);
  expect(first.nextCursor).not.toBeNull();
  const second = await repo.searchListings({ ...query, cursor: first.nextCursor });
  expect(second.items).toHaveLength(5);
  expect(new Set([...first.items, ...second.items].map(i => i.id)).size).toBe(25);
  await expect(repo.searchListings({ ...query, mode: 'barter', cursor: first.nextCursor })).rejects.toThrow(/pencarian/);
});
it('does not promote unavailable stock or surface a hidden storefront', async () => {
  const repo = createPreviewRepository([{ ...a, availability: 'reserved', promoted: true }, { ...a, id: b.id, publisher: { ...a.publisher, storeSlug: 'hidden-store' } }], []);
  expect((await repo.searchListings(query)).items).toEqual([]);
});
it('distinguishes not found from cancellation', async () => {
  const repo = createPreviewRepository([a], []);
  expect(await repo.getListing(b.id)).toBeNull();
  const controller = new AbortController(); controller.abort();
  await expect(repo.searchListings(query, controller.signal)).rejects.toThrow();
});
