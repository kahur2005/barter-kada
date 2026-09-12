import { describe, expect, it, vi } from 'vitest';
import { createSupabaseReportGateway } from './gateway';

describe('report gateway', () => {
  it('sends scoped target context and keeps the open status server-owned', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'e1000000-0000-4000-8000-000000000001', status: 'open' }, error: null });
    const gateway = createSupabaseReportGateway({ rpc } as never);
    await gateway.create({ targetType: 'conversation', targetId: 'e2000000-0000-4000-8000-000000000002', reason: 'harassment', description: 'Pesan berulang dan tidak diinginkan.' });
    expect(rpc).toHaveBeenCalledWith('create_report', expect.objectContaining({ p_target_type: 'conversation', p_reason: 'harassment' }));
  });
});
