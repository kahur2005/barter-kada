import { z } from 'zod';

export type ListingMode = 'sale' | 'barter' | 'free';
export type FulfillmentKind = 'ready_stock' | 'preorder' | 'catering';
export type DiscoveryQuery = {
  query: string; areaId: string; radiusKm: number; category: string | null;
  mode: ListingMode | null; fulfillment: FulfillmentKind | null;
  minPrice: string | null; maxPrice: string | null;
  sort: 'newest' | 'nearest' | 'relevance'; cursor: string | null;
};
const amount = z.string().regex(/^(0|[1-9]\d{0,18})$/);
const image = z.object({ url: z.string().refine(value => /^https:\/\//.test(value) || /^\/assets\/[a-z0-9./_-]+$/i.test(value)), alt: z.string() });
const area = z.object({ id: z.string(), name: z.string(), distanceKm: z.number().int().nonnegative() });
const reputation = { rating: z.number().min(1).max(5).nullable(), reviewCount: z.number().int().nonnegative() };
export const listingSchema = z.object({
  id: z.string().uuid(), title: z.string().min(1).max(120), description: z.string(),
  modes: z.array(z.enum(['sale', 'barter', 'free'])).min(1).max(2).refine(modes => new Set(modes).size === modes.length && (!modes.includes('free') || modes.length === 1)),
  fulfillment: z.enum(['ready_stock', 'preorder', 'catering']), category: z.string(),
  condition: z.string(), defects: z.string(), priceMin: amount.nullable(), priceMax: amount.nullable(),
  unit: z.string(), negotiable: z.boolean(), barterPreferences: z.string().nullable(), area,
  publisher: z.object({ id: z.string().uuid(), name: z.string(), storeSlug: z.string().nullable(), phoneVerified: z.boolean(), ...reputation }),
  images: z.array(image).max(8),
  variants: z.array(z.object({ id: z.string(), name: z.string(), price: amount, unit: z.string() })),
  preorder: z.object({ closesAt: z.string().datetime(), availableAt: z.string().datetime(), minimumQty: z.number().int().positive(), remainingQty: z.number().int().nonnegative().nullable(), dpPercent: z.number().int().min(1).max(100).nullable() }).nullable(),
  catering: z.object({ minimumQty: z.number().int().positive(), leadTimeHours: z.number().int().positive(), serviceAreas: z.array(z.string()), notes: z.string() }).nullable(),
  handoverMethods: z.array(z.enum(['pickup', 'meetup', 'delivery'])),
  availability: z.enum(['available', 'reserved', 'sold', 'closed']), promoted: z.boolean(), createdAt: z.string().datetime(),
}).refine(value => !value.modes.includes('sale') || (value.priceMin !== null && value.priceMax !== null && BigInt(value.priceMin) <= BigInt(value.priceMax)), 'Harga jual tidak lengkap.');
export const storeSchema = z.object({
  id: z.string().uuid(), slug: z.string(), name: z.string(), description: z.string(), category: z.string(),
  area, hours: z.string(), handoverMethods: z.array(z.enum(['pickup', 'meetup', 'delivery'])),
  publicAddress: z.string().nullable(), publicAddressConsent: z.boolean(), image: image.nullable(), ...reputation,
}).transform(store => ({ ...store, publicAddress: store.publicAddressConsent ? store.publicAddress : null }));
export const listingPageSchema = z.object({ items: z.array(listingSchema), nextCursor: z.string().nullable() });
export const storePageSchema = z.object({ items: z.array(storeSchema), nextCursor: z.string().nullable() });
export const serviceAreaRowsSchema = z.array(z.object({ area_id: z.string().min(1).max(100), name: z.string().min(2).max(100) }));
export type PublicListing = z.infer<typeof listingSchema>;
export type PublicStore = z.infer<typeof storeSchema>;
export type ListingPage = z.infer<typeof listingPageSchema>;
export type StorePage = z.infer<typeof storePageSchema>;
