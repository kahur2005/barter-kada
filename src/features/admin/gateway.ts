import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { adminReportSchema, type AdminReport, type AdminReportPage, type PlanSettings, type PlanSettingsHistoryPage, type ProductMetrics, type ReportOutcome, type ReportStatus, type SanctionKind, type FollowUpKind } from './types';

export interface AdminGateway {
  listReports(input: { status: ReportStatus | 'all'; cursor: string | null }): Promise<AdminReportPage>;
  getReport(id: string): Promise<AdminReport>;
  decide(reportId: string, expectedVersion: number, input: { outcome: ReportOutcome; rationale: string; actionUserId: string | null; sanctionKind: SanctionKind | null; durationDays: number | null; followUpKind: FollowUpKind | null; followUpDueAt: string | null }): Promise<AdminReport>;
  getPlanSettings(): Promise<PlanSettings>;
  updatePlanLimits(input: { expectedVersion: number; personalActiveLimit: number; storeProductActiveLimit: number; reason: string; idempotencyKey: string }): Promise<PlanSettings>;
  listPlanSettingsHistory(cursor: number | null): Promise<PlanSettingsHistoryPage>;
  getProductMetrics(input: { from: string; to: string }): Promise<ProductMetrics>;
}
const failure = () => new Error('Panel admin belum dapat memproses permintaan.');
const pageSchema = z.object({ items: z.array(adminReportSchema), nextCursor: z.string().nullable() });
const planSettingsSchema: z.ZodType<PlanSettings> = z.object({ version: z.number().int().positive(), personalActiveLimit: z.number().int().positive(), storeProductActiveLimit: z.number().int().positive(), maxStores: z.number().int().positive(), plusPriceRupiah: z.string(), personalActiveCount: z.number().int().nonnegative(), storeProductActiveCount: z.number().int().nonnegative(), personalOverLimitOwners: z.number().int().nonnegative(), storeOverLimitStores: z.number().int().nonnegative() });
const historySchema: z.ZodType<PlanSettingsHistoryPage> = z.object({ items: z.array(z.object({ version: z.number().int().positive(), personalActiveLimit: z.number().int().positive(), storeProductActiveLimit: z.number().int().positive(), reason: z.string(), actorName: z.string().nullable(), effectiveAt: z.string().datetime() })), nextCursor: z.number().int().positive().nullable() });
const productMetricsSchema: z.ZodType<ProductMetrics> = z.object({ window: z.object({ from: z.string(), to: z.string() }), activeListingsByArea: z.array(z.object({ weekStart: z.string(), areaId: z.string(), activeListings: z.number().int().nonnegative() })), completedTransactions: z.array(z.object({ kind: z.string(), count: z.number().int().nonnegative() })), averageChatResponseSeconds: z.number().nonnegative().nullable(), retention: z.object({ cohortUsers: z.number().int().nonnegative(), d7Users: z.number().int().nonnegative(), d7Rate: z.number().nonnegative().nullable(), w1Users: z.number().int().nonnegative(), w1Rate: z.number().nonnegative().nullable() }), activeStoreCount: z.number().int().nonnegative(), activePlusUserCount: z.number().int().nonnegative(), generatedAt: z.string().datetime({ offset: true }) });
export function createSupabaseAdminGateway(client: SupabaseClient): AdminGateway {
  return {
    async listReports({ status, cursor }) {
      const { data, error } = await client.rpc('admin_list_reports', { p_status: status, p_cursor: cursor, p_limit: 20 });
      const parsed = pageSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
    async getReport(id) {
      const { data, error } = await client.rpc('admin_get_report', { p_report_id: id });
      const parsed = adminReportSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
    async decide(reportId, expectedVersion, input) {
      const { data, error } = await client.rpc('admin_decide_report', { p_report_id: reportId, p_expected_version: expectedVersion, p_outcome: input.outcome, p_rationale: input.rationale, p_action_user_id: input.actionUserId, p_sanction_kind: input.sanctionKind, p_duration_days: input.durationDays, p_follow_up_kind: input.followUpKind, p_follow_up_due_at: input.followUpDueAt });
      const parsed = adminReportSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
    async getPlanSettings() {
      const { data, error } = await client.rpc('admin_get_plan_settings');
      const parsed = planSettingsSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
    async updatePlanLimits(input) {
      const { data, error } = await client.rpc('update_plan_limits', { p_expected_version: input.expectedVersion, p_personal_active_limit: input.personalActiveLimit, p_store_product_active_limit: input.storeProductActiveLimit, p_reason: input.reason, p_idempotency_key: input.idempotencyKey });
      const parsed = planSettingsSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
    async listPlanSettingsHistory(cursor) {
      const { data, error } = await client.rpc('list_settings_history', { p_cursor: cursor, p_limit: 20 });
      const parsed = historySchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
    async getProductMetrics(input) {
      const { data, error } = await client.rpc('get_product_metrics', { p_from: input.from, p_to: input.to });
      const parsed = productMetricsSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
  };
}
