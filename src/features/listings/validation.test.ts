import { describe, expect, it } from 'vitest';
import type { ListingDraft } from './types';
import { validateListingDraft } from './validation';

const now = new Date('2026-09-11T12:00:00.000Z');
function valid(overrides: Partial<ListingDraft> = {}): ListingDraft {
  return {
    listingId: null, expectedVersion: null, publisher: { kind: 'personal' }, modes: ['sale'], fulfillment: 'ready_stock', categoryId: 'clothing',
    title: 'Kemeja batik preloved', description: 'Dipakai dua kali dan masih sangat layak.', condition: 'like_new', defects: 'Tidak ada kekurangan yang diketahui.',
    negotiable: true, barter: null, basePriceRupiah: '150000', variants: [], assetIds: ['10000000-0000-4000-8000-000000000001'],
    handoverMethods: ['meetup'], preorder: null, catering: null, ...overrides,
  };
}
function fields(draft: ListingDraft, intent: 'draft' | 'publish' = 'publish') { return validateListingDraft(draft, { intent, now }).map(issue => issue.field); }

describe('listing mode and publication validation', () => {
  it('accepts sale, barter, sale+barter, and free ready-stock contracts', () => {
    expect(fields(valid())).toEqual([]);
    expect(fields(valid({ modes: ['barter'], basePriceRupiah: null, negotiable: false, barter: { openToOffers: false, wantedDescription: 'Tanaman hias sehat' } }))).toEqual([]);
    expect(fields(valid({ modes: ['sale', 'barter'], barter: { openToOffers: true, wantedDescription: '' } }))).toEqual([]);
    expect(fields(valid({ modes: ['free'], basePriceRupiah: null, negotiable: false }))).toEqual([]);
  });

  it('rejects free mixed with another mode and misleading price fields', () => {
    const result = fields(valid({ modes: ['free', 'sale'], basePriceRupiah: '1000' }));
    expect(result).toContain('modes'); expect(result).toContain('basePriceRupiah');
  });

  it('requires a price for sale and a wanted item when barter is not open', () => {
    expect(fields(valid({ basePriceRupiah: null }))).toContain('basePriceRupiah');
    expect(fields(valid({ modes: ['barter'], basePriceRupiah: null, barter: { openToOffers: false, wantedDescription: '' } }))).toContain('barter.wantedDescription');
  });

  it('allows incomplete drafts but still rejects contradictory mode combinations', () => {
    expect(fields(valid({ title: '', description: '', categoryId: '', assetIds: [], basePriceRupiah: null }), 'draft')).toEqual([]);
    expect(fields(valid({ modes: ['free', 'barter'] }), 'draft')).toContain('modes');
  });
});

describe('variants, category, media, and fulfillment validation', () => {
  it('supports prices larger than Number.MAX_SAFE_INTEGER as integer strings', () => {
    expect(fields(valid({ basePriceRupiah: '900719925474099300' }))).toEqual([]);
    expect(fields(valid({ basePriceRupiah: '12.5' }))).toContain('basePriceRupiah');
  });

  it('rejects duplicate variants and invalid per-variant quota', () => {
    const variants = [
      { clientId: 'a', label: 'Paket A', unit: 'box', priceRupiah: '25000', quota: '10' },
      { clientId: 'b', label: ' paket a ', unit: 'box', priceRupiah: '30000', quota: null },
    ];
    const preorder = { orderClosesAt: '2026-09-12T12:00:00.000Z', fulfillmentAt: '2026-09-13T12:00:00.000Z', minimumQty: '2', quotaMode: 'per_variant' as const, sharedQuota: null, dpPercent: '50' };
    const result = fields(valid({ fulfillment: 'preorder', categoryId: 'food', condition: null, defects: '', basePriceRupiah: null, variants, preorder }));
    expect(result).toContain('variants'); expect(result).toContain('variants.1.quota');
  });

  it('enforces processed photo count and handover selection only for publication', () => {
    expect(fields(valid({ assetIds: [] }))).toContain('assetIds');
    expect(fields(valid({ assetIds: Array.from({ length: 9 }, (_, index) => `${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000001`) }))).toContain('assetIds');
    expect(fields(valid({ handoverMethods: [] }))).toContain('handoverMethods');
  });

  it('requires condition details for non-food ready stock', () => {
    const result = fields(valid({ condition: null, defects: '' }));
    expect(result).toContain('condition'); expect(result).toContain('defects');
    expect(fields(valid({ categoryId: 'food', fulfillment: 'catering', condition: null, defects: '', modes: ['sale'], catering: { minimumQty: '10', unit: 'box', leadTimeHours: '24', serviceAreaIds: ['depok'], availabilityNotes: 'Pesan sehari sebelumnya.' } }))).toEqual([]);
  });

  it('keeps preorder and catering sale-only and validates schedule, quota, and DP', () => {
    const preorder = { orderClosesAt: '2026-09-10T12:00:00.000Z', fulfillmentAt: '2026-09-10T10:00:00.000Z', minimumQty: '0', quotaMode: 'shared' as const, sharedQuota: '0', dpPercent: '101' };
    const result = fields(valid({ fulfillment: 'preorder', categoryId: 'food', condition: null, defects: '', modes: ['sale', 'barter'], preorder }));
    expect(result).toEqual(expect.arrayContaining(['fulfillment', 'preorder.orderClosesAt', 'preorder.fulfillmentAt', 'preorder.minimumQty', 'preorder.sharedQuota', 'preorder.dpPercent']));
  });
});
