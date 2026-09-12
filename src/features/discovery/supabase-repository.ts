import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { DiscoveryRepository } from './repository';
import { listingPageSchema, listingSchema, storePageSchema, storeSchema } from './types';

export function createSupabaseRepository(client: SupabaseClient): DiscoveryRepository {
  const processedPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i;
  async function materializeListing(value: unknown): Promise<unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const listing = value as Record<string, unknown>;
    if (!Array.isArray(listing.images)) return value;
    return {
      ...listing,
      images: await Promise.all(listing.images.map(async image => {
        if (!image || typeof image !== 'object') return image;
        const candidate = image as Record<string, unknown>;
        if (typeof candidate.path !== 'string' || !processedPath.test(candidate.path)) return image;
        const { data, error } = await client.storage.from('listing-media').createSignedUrl(candidate.path, 300);
        if (error || !data?.signedUrl) return image;
        return { ...candidate, url: data.signedUrl };
      })),
    };
  }
  async function materializePage(value: unknown): Promise<unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const page = value as Record<string, unknown>;
    return Array.isArray(page.items) ? { ...page, items: await Promise.all(page.items.map(materializeListing)) } : value;
  }
  async function call<T>(name: string, args: Record<string, unknown>, schema: z.ZodType<T>, signal?: AbortSignal, prepare: (value: unknown) => unknown | Promise<unknown> = value => value): Promise<T> {
    signal?.throwIfAborted();
    const request = client.rpc(name, args);
    if (signal) request.abortSignal(signal);
    const { data, error } = await request;
    signal?.throwIfAborted();
    if (error) throw new Error('Tidak dapat memuat data. Periksa koneksi lalu coba lagi.');
    const parsed = schema.safeParse(await prepare(data));
    if (!parsed.success) throw new Error('Data belum dapat ditampilkan karena format respons tidak sesuai.');
    return parsed.data;
  }
  return {
    source: 'supabase',
    searchListings: (query, signal) => call('search_listings', { p_query: query }, listingPageSchema, signal, materializePage),
    getListing: (id, signal) => call('get_listing', { p_id: id }, listingSchema.nullable(), signal, materializeListing),
    searchStores: (query, signal) => call('search_stores', { p_query: query }, storePageSchema, signal),
    getStore: (slug, signal) => call('get_store', { p_slug: slug }, storeSchema.nullable(), signal),
    getStoreListings: (slug, query, signal) => call('get_store_listings', { p_slug: slug, p_query: query }, listingPageSchema, signal, materializePage),
  };
}
