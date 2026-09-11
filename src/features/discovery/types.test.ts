import { expect, it } from 'vitest';
import { listingSchema } from './types';
import { listing } from '../../test/fixtures';

it('strips unexpected private fields from every public object', () => {
  const result = listingSchema.parse({ ...listing, phone: '+628123', exactLocation: [1, 2], publisher: { ...listing.publisher, address: 'private' } });
  expect(result).toEqual(listing);
});
it.each([{ priceMin: 150000 }, { priceMin: '-1' }, { modes: ['free', 'sale'] }, { title: '' }, { images: [{ url: 'javascript:alert(1)', alt: 'photo' }] }])('rejects malformed public listing %j', override => {
  expect(listingSchema.safeParse({ ...listing, ...override }).success).toBe(false);
});
