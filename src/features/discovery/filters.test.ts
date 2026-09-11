import { expect, it } from 'vitest';
import { parseDiscoveryQuery, serializeDiscoveryQuery } from './filters';

it('uses a 5 km default and normalizes invalid filters', () => {
  expect(parseDiscoveryQuery(new URLSearchParams('radius=NaN&min=-5&mode=anything'))).toMatchObject({ radiusKm: 5, minPrice: null, mode: null, areaId: 'depok', cursor: null });
});
it('round trips non-sensitive search state without retaining injected coordinates', () => {
  const parsed = parseDiscoveryQuery(new URLSearchParams('q=kursi&area=bogor&radius=20&category=home&mode=barter&fulfillment=ready_stock&min=100&max=9000&sort=nearest&lat=-6.111111'));
  expect(parsed).toMatchObject({ query: 'kursi', areaId: 'bogor', radiusKm: 20, category: 'home', mode: 'barter', fulfillment: 'ready_stock', minPrice: '100', maxPrice: '9000', sort: 'nearest' });
  const serialized = serializeDiscoveryQuery(parsed);
  expect(serialized.has('lat')).toBe(false);
  expect(parseDiscoveryQuery(serialized)).toEqual(parsed);
});
it('uses relevance for a query and newest for a blank query', () => {
  expect(parseDiscoveryQuery(new URLSearchParams('q=kursi')).sort).toBe('relevance');
  expect(parseDiscoveryQuery(new URLSearchParams()).sort).toBe('newest');
});
it('limits query size and rejects malformed money rather than rounding it', () => {
  expect(parseDiscoveryQuery(new URLSearchParams({ q: 'x'.repeat(300), min: '1.5', max: '1e10', radius: '1000' }))).toMatchObject({ query: 'x'.repeat(120), minPrice: null, maxPrice: null, radiusKm: 5 });
});
