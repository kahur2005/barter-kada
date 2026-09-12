import type { DiscoveryQuery, PublicListing, PublicStore } from './types';
import { areas } from './filters';
import type { DiscoveryRepository } from './repository';

const areaOrder = ['depok', 'jakarta-selatan', 'bogor', 'bekasi', 'tangerang'];
// Deliberately synthetic; production proximity is computed by PostGIS, not this module.
function approximateDistance(area: { id: string; distanceKm: number }, areaId: string) {
  return area.distanceKm + Math.abs(areaOrder.indexOf(area.id) - areaOrder.indexOf(areaId)) * 12;
}
function paginate<T>(items: T[], query: DiscoveryQuery) {
  const fingerprint = JSON.stringify({ ...query, cursor: null });
  let offset = 0;
  if (query.cursor) {
    try {
      const parsed = JSON.parse(query.cursor);
      if (parsed.key !== fingerprint || !Number.isSafeInteger(parsed.offset) || parsed.offset < 0) throw new Error();
      offset = parsed.offset;
    } catch { throw new Error('Halaman tidak cocok dengan pencarian. Muat ulang hasil.'); }
  }
  return { items: items.slice(offset, offset + 20), nextCursor: offset + 20 < items.length ? JSON.stringify({ key: fingerprint, offset: offset + 20 }) : null };
}
function matches(item: PublicListing, query: DiscoveryQuery, catalogue = false) {
  const haystack = `${item.title} ${item.publisher.name}`.toLocaleLowerCase('id');
  return (!query.query || haystack.includes(query.query.toLocaleLowerCase('id'))) &&
    (!query.category || item.category === query.category) && (!query.mode || item.modes.includes(query.mode)) &&
    (!query.fulfillment || item.fulfillment === query.fulfillment) &&
    (catalogue || approximateDistance(item.area, query.areaId) <= query.radiusKm) &&
    (!query.minPrice || (item.priceMax !== null && BigInt(item.priceMax) >= BigInt(query.minPrice))) &&
    (!query.maxPrice || (item.priceMin !== null && BigInt(item.priceMin) <= BigInt(query.maxPrice)));
}
function sortListings(items: PublicListing[], query: DiscoveryQuery) {
  return items.sort((a, b) => {
    if (query.sort === 'nearest') return a.area.distanceKm - b.area.distanceKm || a.id.localeCompare(b.id);
    if (query.sort === 'relevance' && query.query) {
      const q = query.query.toLocaleLowerCase('id');
      const difference = Number(b.title.toLocaleLowerCase('id').startsWith(q)) - Number(a.title.toLocaleLowerCase('id').startsWith(q));
      if (difference) return difference;
    }
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  });
}
export function createPreviewRepository(listings: PublicListing[], stores: PublicStore[]): DiscoveryRepository {
  const visible = (item: PublicListing) => !item.publisher.storeSlug || stores.some(store => store.slug === item.publisher.storeSlug);
  function search(query: DiscoveryQuery, signal?: AbortSignal, slug?: string) {
    signal?.throwIfAborted();
    const entries = listings.filter(item => visible(item) && item.availability === 'available' && (!slug || item.publisher.storeSlug === slug) && matches(item, query, !!slug))
      .map(item => ({ ...item, promoted: false, area: { ...item.area, distanceKm: approximateDistance(item.area, query.areaId) } }));
    return paginate(sortListings(entries, query), query);
  }
  return {
    source: 'preview',
    listAreas: async signal => { signal?.throwIfAborted(); return areas.map(area => ({ areaId: area.id, name: area.name })); },
    searchListings: async (query, signal) => search(query, signal),
    getListing: async (id, signal) => { signal?.throwIfAborted(); return listings.find(item => item.id === id && visible(item)) ?? null; },
    searchStores: async (query, signal) => {
      signal?.throwIfAborted();
      const matchesStores = stores.filter(store => approximateDistance(store.area, query.areaId) <= query.radiusKm &&
        (!query.query || store.name.toLocaleLowerCase('id').includes(query.query.toLocaleLowerCase('id'))) && (!query.category || store.category === query.category))
        .map(store => ({ ...store, area: { ...store.area, distanceKm: approximateDistance(store.area, query.areaId) } }));
      matchesStores.sort((a, b) => query.sort === 'nearest' ? a.area.distanceKm - b.area.distanceKm || a.slug.localeCompare(b.slug) : a.name.localeCompare(b.name));
      return paginate(matchesStores, query);
    },
    getStore: async (slug, signal) => { signal?.throwIfAborted(); return stores.find(store => store.slug === slug) ?? null; },
    getStoreListings: async (slug, query, signal) => search(query, signal, slug),
  };
}
