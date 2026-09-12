import { z } from 'zod';

export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'decided' | 'closed';
export type ReportOutcome = 'no_action' | 'return_required' | 'cancel_transaction' | 'admin_complete' | 'restrict_account' | 'ban_account';
export type SanctionKind = 'restriction' | 'ban';
export const adminReportSchema = z.object({
  id: z.string().uuid(), targetType: z.enum(['listing', 'conversation', 'barter', 'order', 'review']), targetId: z.string().uuid(),
  reason: z.enum(['scam', 'unsafe', 'not_as_described', 'harassment', 'other']), description: z.string(), status: z.enum(['open', 'under_review', 'resolved', 'rejected', 'decided', 'closed']),
  createdAt: z.string().datetime(), decisionVersion: z.number().int().positive().optional(), reporter: z.object({ id: z.string().uuid(), name: z.string() }),
  context: z.object({ title: z.string(), href: z.string().regex(/^\//), summary: z.string().nullable().optional() }),
  decision: z.object({ outcome: z.string(), rationale: z.string(), decidedAt: z.string().datetime(), adminName: z.string().nullable().optional() }).nullable(),
  evidence: z.array(z.object({ id: z.string().uuid(), sourceType: z.string(), sourceId: z.string().uuid(), note: z.string(), createdAt: z.string().datetime() })).optional(),
});
export type AdminReport = z.infer<typeof adminReportSchema>;
export type AdminReportPage = { items: AdminReport[]; nextCursor: string | null };
