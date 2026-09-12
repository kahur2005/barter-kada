import type { DiscoveryQuery, ListingPage, PublicListing, PublicStore, StorePage } from './types';

export type DiscoveryArea = { areaId: string; name: string };

export interface DiscoveryRepository {
  source: 'preview' | 'supabase';
  listAreas(signal?: AbortSignal): Promise<DiscoveryArea[]>;
  searchListings(query: DiscoveryQuery, signal?: AbortSignal): Promise<ListingPage>;
  getListing(id: string, signal?: AbortSignal): Promise<PublicListing | null>;
  searchStores(query: DiscoveryQuery, signal?: AbortSignal): Promise<StorePage>;
  getStore(slug: string, signal?: AbortSignal): Promise<PublicStore | null>;
  getStoreListings(slug: string, query: DiscoveryQuery, signal?: AbortSignal): Promise<ListingPage>;
}
