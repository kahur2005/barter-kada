import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { BillingOrder, PlusStatus, StoreInput, StoreSummary } from './types';
const statusSchema: z.ZodType<PlusStatus> = z.object({ priceRupiah: z.string(), maxStores: z.number().int().positive(), active: z.boolean(), paidThrough: z.string().datetime().nullable(), storeCount: z.number().int().nonnegative() });
const billingSchema: z.ZodType<BillingOrder> = z.object({ id: z.string().uuid(), amountRupiah: z.string(), method: z.enum(['qris', 'virtual_account']), mode: z.literal('dummy'), status: z.enum(['pending', 'succeeded', 'failed', 'expired']), expiresAt: z.string().datetime() });
const storeSchema: z.ZodType<StoreSummary> = z.object({ id: z.string().uuid(), slug: z.string(), name: z.string(), description: z.string(), category: z.string(), areaLabel: z.string(), status: z.enum(['active', 'hidden']), updatedAt: z.string().datetime().optional() });
export interface StoreGateway { getPlusStatus(): Promise<PlusStatus>; createBillingOrder(method: BillingOrder['method']): Promise<BillingOrder>; simulateBilling(id: string, result: Exclude<BillingOrder['status'], 'pending'>): Promise<{ id: string; status: BillingOrder['status']; active: boolean }>; createStore(input: StoreInput): Promise<StoreSummary>; getMyStores(): Promise<StoreSummary[]>; }
const failure = () => new Error('Fitur Plus belum dapat memproses permintaan.');
export function createSupabaseStoreGateway(client: SupabaseClient): StoreGateway {
  return {
    async getPlusStatus() { const { data, error } = await client.rpc('get_plus_status'); const parsed = statusSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data; },
    async createBillingOrder(method) { const { data, error } = await client.rpc('create_plus_billing_order', { p_method: method }); const parsed = billingSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data; },
    async simulateBilling(id, result) { const { data, error } = await client.rpc('simulate_plus_billing', { p_billing_order_id: id, p_result: result }); const parsed = z.object({ id: z.string().uuid(), status: z.enum(['pending', 'succeeded', 'failed', 'expired']), active: z.boolean() }).safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data; },
    async createStore(input) { const { data, error } = await client.rpc('create_store', { p_slug: input.slug, p_name: input.name, p_description: input.description, p_category: input.category, p_area_id: input.areaId, p_area_label: input.areaLabel, p_operating_hours: input.operatingHours, p_handover_methods: input.handoverMethods, p_public_address: input.publicAddress, p_public_address_consent: input.publicAddressConsent }); const parsed = storeSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data; },
    async getMyStores() { const { data, error } = await client.rpc('get_my_stores'); const parsed = z.array(storeSchema).safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data; },
  };
}
