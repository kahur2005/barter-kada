import { describe, expect, it, vi } from 'vitest';
import { createSupabaseTransactionGateway } from './gateway';

describe('transaction index gateway', () => {
  it('loads only the selected server-owned transaction kind', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: 'f1000000-0000-4000-8000-000000000001', kind: 'barter', lifecycle: 'negotiating', counterpartName: 'Dita', title: 'Jaket dan rak', href: '/transactions/f1000000-0000-4000-8000-000000000001', updatedAt: '2026-09-12T03:00:00.000Z' }], error: null });
    const gateway = createSupabaseTransactionGateway({ rpc } as never);
    await gateway.list('barter');
    expect(rpc).toHaveBeenCalledWith('list_my_transactions', { p_kind: 'barter' });
  });
});
