import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { DiscoveryRepository } from './repository';
import { listingPageSchema, listingSchema, storePageSchema, storeSchema } from './types';

export function createSupabaseRepository(client: SupabaseClient): DiscoveryRepository {
  async function call<T>(name: string, args: Record<string, unknown>, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    signal?.throwIfAborted();
    const request = client.rpc(name, args);
    if (signal) request.abortSignal(signal);
    const { data, error } = await request;
    signal?.throwIfAborted();
    if (error) throw new Error('Tidak dapat memuat data. Periksa koneksi lalu coba lagi.');
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new Error('Data belum dapat ditampilkan karena format respons tidak sesuai.');
    return parsed.data;
  }
  return {
    source: 'supabase',
    searchListings: (query, signal) => call('search_listings', { p_query: query }, listingPageSchema, signal),
    getListing: (id, signal) => call('get_listing', { p_id: id }, listingSchema.nullable(), signal),
    searchStores: (query, signal) => call('search_stores', { p_query: query }, storePageSchema, signal),
    getStore: (slug, signal) => call('get_store', { p_slug: slug }, storeSchema.nullable(), signal),
    getStoreListings: (slug, query, signal) => call('get_store_listings', { p_slug: slug, p_query: query }, listingPageSchema, signal),
  };
}
