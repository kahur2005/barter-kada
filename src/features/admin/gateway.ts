import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { adminReportSchema, type AdminReport, type AdminReportPage, type ReportOutcome, type ReportStatus, type SanctionKind } from './types';

export interface AdminGateway {
  listReports(input: { status: ReportStatus | 'all'; cursor: string | null }): Promise<AdminReportPage>;
  getReport(id: string): Promise<AdminReport>;
  decide(reportId: string, expectedVersion: number, input: { outcome: ReportOutcome; rationale: string; actionUserId: string | null; sanctionKind: SanctionKind | null; durationDays: number | null }): Promise<AdminReport>;
}
const failure = () => new Error('Panel admin belum dapat memproses permintaan.');
const pageSchema = z.object({ items: z.array(adminReportSchema), nextCursor: z.string().nullable() });
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
      const { data, error } = await client.rpc('admin_decide_report', { p_report_id: reportId, p_expected_version: expectedVersion, p_outcome: input.outcome, p_rationale: input.rationale, p_action_user_id: input.actionUserId, p_sanction_kind: input.sanctionKind, p_duration_days: input.durationDays });
      const parsed = adminReportSchema.safeParse(data); if (error || !parsed.success) throw failure(); return parsed.data;
    },
  };
}
