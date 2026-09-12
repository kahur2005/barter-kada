import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
export type ReportInput = { targetType: 'listing' | 'conversation' | 'barter' | 'order'; targetId: string; reason: 'scam' | 'unsafe' | 'not_as_described' | 'harassment' | 'other'; description: string };
export type ReportResult = { id: string; status: 'open' };
export interface ReportGateway { create(input: ReportInput): Promise<ReportResult>; }
export function createSupabaseReportGateway(client: SupabaseClient): ReportGateway { return { async create(input) { const { data, error } = await client.rpc('create_report', { p_target_type: input.targetType, p_target_id: input.targetId, p_reason: input.reason, p_description: input.description }); const parsed = z.object({ id: z.string().uuid(), status: z.literal('open') }).safeParse(data); if (error || !parsed.success) throw new Error('Laporan belum dapat dikirim.'); return parsed.data; } }; }
