import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { OnboardingGateway } from './types';

const stateSchema = z.object({ nextStep: z.enum(['profile', 'location', 'phone', 'complete']), displayName: z.string(), bio: z.string().nullable(), areaId: z.string().nullable(), maskedPhone: z.string().nullable(), phoneVerified: z.boolean() });
const areaSchema = z.object({ area_id: z.string(), name: z.string() });
const requestSchema = z.object({ challengeId: z.uuid(), expiresAt: z.iso.datetime({ offset: true }), resendAt: z.iso.datetime({ offset: true }), deliveryStatus: z.enum(['accepted', 'failed', 'unknown']) });
function failure(): Error { return new Error('Layanan profil belum dapat memproses permintaan.'); }
function parseState(data: unknown) { const parsed = stateSchema.safeParse(data); if (!parsed.success) throw failure(); return parsed.data; }

export function createSupabaseOnboardingGateway(client: SupabaseClient): OnboardingGateway {
  return {
    async getState() { const { data, error } = await client.rpc('get_my_onboarding'); if (error) throw failure(); return parseState(data); },
    async listAreas() {
      const { data, error } = await client.from('service_areas').select('area_id,name').eq('enabled', true).order('name');
      if (error) throw failure();
      const parsed = z.array(areaSchema).safeParse(data); if (!parsed.success) throw failure();
      return parsed.data.map(area => ({ areaId: area.area_id, name: area.name }));
    },
    async completeProfile(input) { const { data, error } = await client.rpc('complete_profile', { p_display_name: input.displayName, p_bio: input.bio }); if (error) throw failure(); return parseState(data); },
    async setLocation(input) { const { data, error } = await client.rpc('set_location', { p_area_id: input.areaId, p_latitude: input.latitude, p_longitude: input.longitude, p_address: input.address }); if (error) throw failure(); return parseState(data); },
    async requestOtp(input) { const { data, error } = await client.functions.invoke('otp', { body: { action: 'request', ...input } }); if (error) throw failure(); const parsed = requestSchema.safeParse(data); if (!parsed.success) throw failure(); return parsed.data; },
    async verifyOtp(input) { const { data, error } = await client.functions.invoke('otp', { body: { action: 'verify', ...input } }); if (error || typeof data !== 'object' || data === null || !('onboarding' in data)) throw failure(); return parseState(data.onboarding); },
  };
}
