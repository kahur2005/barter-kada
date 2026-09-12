import { describe, expect, it, vi } from 'vitest';
import { createSupabaseReportGateway } from './gateway';

describe('report gateway', () => {
  it('sends scoped target context and keeps the open status server-owned', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'e1000000-0000-4000-8000-000000000001', status: 'open' }, error: null });
    const gateway = createSupabaseReportGateway({ rpc } as never);
    await gateway.create({ targetType: 'conversation', targetId: 'e2000000-0000-4000-8000-000000000002', reason: 'harassment', description: 'Pesan berulang dan tidak diinginkan.' });
    expect(rpc).toHaveBeenCalledWith('create_report', expect.objectContaining({ p_target_type: 'conversation', p_reason: 'harassment' }));
  });

  it('attaches evidence through the scoped RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'e3000000-0000-4000-8000-000000000003' }, error: null });
    const gateway = createSupabaseReportGateway({ rpc } as never);
    await gateway.attachEvidence('e1000000-0000-4000-8000-000000000001', { sourceType: 'message', sourceId: 'e2000000-0000-4000-8000-000000000002', note: 'Pesan terkait.' });
    expect(rpc).toHaveBeenCalledWith('attach_report_evidence', expect.objectContaining({ p_source_type: 'message', p_source_id: 'e2000000-0000-4000-8000-000000000002' }));
  });
});
