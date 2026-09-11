import type { DiscoveryQuery } from './types';

export const categories = [
  { id: 'food', name: 'Makanan' }, { id: 'clothing', name: 'Pakaian' },
  { id: 'home', name: 'Rumah & furnitur' }, { id: 'vehicles', name: 'Kendaraan' },
  { id: 'garden', name: 'Kebun' }, { id: 'other', name: 'Lainnya' },
] as const;
export const areas = [
  { id: 'depok', name: 'Depok' }, { id: 'jakarta-selatan', name: 'Jakarta Selatan' },
  { id: 'bogor', name: 'Bogor' }, { id: 'bekasi', name: 'Bekasi' },
  { id: 'tangerang', name: 'Tangerang' },
] as const;
// Draft D-02/Q-02. These choices must eventually come from backend settings.
export const radii = [5, 10, 20, 50];
const money = (value: string | null) => value && /^(0|[1-9]\d{0,18})$/.test(value) ? value : null;
function option<T extends string>(value: string | null, options: readonly T[]): T | null {
  return options.includes(value as T) ? value as T : null;
}
export function parseDiscoveryQuery(params: URLSearchParams): DiscoveryQuery {
  const query = (params.get('q') ?? '').trim().slice(0, 120);
  const radius = Number(params.get('radius'));
  return {
    query, areaId: option(params.get('area'), areas.map(a => a.id)) ?? 'depok',
    radiusKm: radii.includes(radius) ? radius : 5,
    category: option(params.get('category'), categories.map(c => c.id)),
    mode: option(params.get('mode'), ['sale', 'barter', 'free']),
    fulfillment: option(params.get('fulfillment'), ['ready_stock', 'preorder', 'catering']),
    minPrice: money(params.get('min')), maxPrice: money(params.get('max')),
    sort: option(params.get('sort'), ['newest', 'nearest', 'relevance']) ?? (query ? 'relevance' : 'newest'),
    cursor: null,
  };
}
export function serializeDiscoveryQuery(query: DiscoveryQuery): URLSearchParams {
  const params = new URLSearchParams({ area: query.areaId, radius: String(query.radiusKm), sort: query.sort });
  for (const [key, value] of Object.entries({ q: query.query, category: query.category, mode: query.mode, fulfillment: query.fulfillment, min: query.minPrice, max: query.maxPrice })) {
    if (value) params.set(key, value);
  }
  return params;
}
