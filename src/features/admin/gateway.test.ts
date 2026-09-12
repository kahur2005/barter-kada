import { describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminGateway } from './gateway';

const report = { id: 'f1000000-0000-4000-8000-000000000001', targetType: 'conversation' as const, targetId: 'f2000000-0000-4000-8000-000000000002', reason: 'harassment' as const, description: 'Pesan berulang dan tidak diinginkan.', status: 'open' as const, createdAt: '2026-09-12T03:00:00.000Z', reporter: { id: 'f3000000-0000-4000-8000-000000000003', name: 'Pelapor' }, context: { title: 'Percakapan listing', href: '/chat/f2000000-0000-4000-8000-000000000002' }, decision: null };

describe('admin gateway', () => {
  it('keeps report queue and decision data server-owned', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { items: [report], nextCursor: null }, error: null })
      .mockResolvedValueOnce({ data: { ...report, status: 'decided', decision: { outcome: 'no_action', rationale: 'Konteks sudah diperiksa.', decidedAt: '2026-09-12T03:02:00.000Z' } }, error: null });
    const gateway = createSupabaseAdminGateway({ rpc } as never);
    await gateway.listReports({ status: 'open', cursor: null });
    await gateway.decide(report.id, 1, { outcome: 'no_action', rationale: 'Konteks sudah diperiksa.', actionUserId: null, sanctionKind: null, durationDays: null });
    expect(rpc).toHaveBeenNthCalledWith(1, 'admin_list_reports', { p_status: 'open', p_cursor: null, p_limit: 20 });
    expect(rpc).toHaveBeenNthCalledWith(2, 'admin_decide_report', expect.objectContaining({ p_report_id: report.id, p_expected_version: 1, p_outcome: 'no_action' }));
  });
});
