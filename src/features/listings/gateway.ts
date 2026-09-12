import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ListingDraft } from './types';

export type ListingSaveResult = { listingId: string; version: number; lifecycle: 'draft' | 'active' };
export type MineListing = { listingId: string; title: string; lifecycle: 'draft' | 'active' | 'archived' | 'completed'; version: number; reserved: boolean; updatedAt: string };
export interface ListingGateway {
  saveDraft(draft: ListingDraft): Promise<ListingSaveResult>;
  publish(draft: ListingDraft): Promise<ListingSaveResult>;
  getMine(listingId: string): Promise<ListingDraft | null>;
  uploadImage(file: File, onProgress: (percent: number) => void): Promise<string>;
  listMine(lifecycle: MineListing['lifecycle']): Promise<{ items: MineListing[]; activeCount: number; activeLimit: number }>;
  archive(listingId: string, expectedVersion: number): Promise<void>;
}

function unavailable(): Error { return new Error('Layanan listing belum dapat memproses permintaan.'); }
function jakartaDateTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return value;
  const parsed = new Date(`${value.length === 16 ? `${value}:00` : value}+07:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
function commandPayload(draft: ListingDraft): ListingDraft {
  if (!draft.preorder) return draft;
  return { ...draft, preorder: { ...draft.preorder, orderClosesAt: jakartaDateTime(draft.preorder.orderClosesAt), fulfillmentAt: jakartaDateTime(draft.preorder.fulfillmentAt) } };
}
const draftSchema: z.ZodType<ListingDraft> = z.object({
  sourceLifecycle: z.enum(['draft', 'active', 'archived', 'completed']).nullable().optional(),
  listingId: z.string().uuid().nullable(), expectedVersion: z.number().int().nonnegative().nullable(),
  publisher: z.discriminatedUnion('kind', [z.object({ kind: z.literal('personal') }), z.object({ kind: z.literal('store'), storeId: z.string().uuid() })]),
  modes: z.array(z.enum(['sale', 'barter', 'free'])), fulfillment: z.enum(['ready_stock', 'preorder', 'catering']), categoryId: z.string(),
  title: z.string(), description: z.string(), condition: z.enum(['new', 'like_new', 'good', 'fair', 'needs_repair']).nullable(), defects: z.string(), negotiable: z.boolean(),
  barter: z.object({ openToOffers: z.boolean(), wantedDescription: z.string() }).nullable(), basePriceRupiah: z.string().nullable(),
  variants: z.array(z.object({ clientId: z.string(), label: z.string(), unit: z.string(), priceRupiah: z.string(), quota: z.string().nullable() })),
  assetIds: z.array(z.string().uuid()), handoverMethods: z.array(z.enum(['pickup', 'meetup', 'delivery'])),
  preorder: z.object({ orderClosesAt: z.string(), fulfillmentAt: z.string(), minimumQty: z.string(), quotaMode: z.enum(['unlimited', 'shared', 'per_variant']), sharedQuota: z.string().nullable(), dpPercent: z.string() }).nullable(),
  catering: z.object({ minimumQty: z.string(), unit: z.string(), leadTimeHours: z.string(), serviceAreaIds: z.array(z.string()), availabilityNotes: z.string() }).nullable(),
});
export function createSupabaseListingGateway(client: SupabaseClient): ListingGateway {
  async function command(name: 'save_listing_draft' | 'publish_listing', draft: ListingDraft): Promise<ListingSaveResult> {
    const { data, error } = await client.rpc(name, { p_payload: commandPayload(draft) });
    if (error || !data || typeof data !== 'object') throw unavailable();
    const value = data as Record<string, unknown>;
    if (typeof value.listingId !== 'string' || typeof value.version !== 'number' || (value.lifecycle !== 'draft' && value.lifecycle !== 'active')) throw unavailable();
    return { listingId: value.listingId, version: value.version, lifecycle: value.lifecycle };
  }
  return {
    saveDraft: draft => command('save_listing_draft', draft), publish: draft => command('publish_listing', draft),
    async getMine(listingId) {
      const { data, error } = await client.rpc('get_my_listing', { p_listing_id: listingId });
      if (error) throw unavailable();
      if (data === null) return null;
      const parsed = draftSchema.safeParse(data);
      if (!parsed.success) throw unavailable();
      return parsed.data;
    },
    async uploadImage(file, onProgress) {
      onProgress(10);
      const { data: reservation, error: reservationError } = await client.rpc('reserve_listing_asset', {
        p_mime_type: file.type,
        p_byte_size: file.size,
      });
      if (reservationError || !reservation || typeof reservation !== 'object') throw unavailable();
      const reserved = reservation as Record<string, unknown>;
      if (typeof reserved.assetId !== 'string' || typeof reserved.quarantinePath !== 'string') throw unavailable();

      const { error: uploadError } = await client.storage.from('listing-quarantine').upload(reserved.quarantinePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw unavailable();
      onProgress(60);

      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw unavailable();
      const response = await fetch('/api/listing-media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: reserved.assetId }),
      });
      if (!response.ok) throw unavailable();
      const processed = await response.json() as Record<string, unknown>;
      if (processed.assetId !== reserved.assetId) throw unavailable();
      onProgress(100);
      return reserved.assetId;
    },
    async listMine(lifecycle) {
      const { data, error } = await client.rpc('get_my_listings', { p_lifecycle: lifecycle });
      if (error || !data || typeof data !== 'object') throw unavailable();
      const value = data as { items?: MineListing[]; activeCount?: number; activeLimit?: number };
      if (!Array.isArray(value.items) || typeof value.activeCount !== 'number' || typeof value.activeLimit !== 'number') throw unavailable();
      return { items: value.items, activeCount: value.activeCount, activeLimit: value.activeLimit };
    },
    async archive(listingId, expectedVersion) { const { error } = await client.rpc('archive_listing', { p_listing_id: listingId, p_expected_version: expectedVersion }); if (error) throw unavailable(); },
  };
}
