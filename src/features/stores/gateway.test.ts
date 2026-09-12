import { describe, expect, it, vi } from 'vitest';
import { createSupabaseStoreGateway } from './gateway';

describe('Supabase Plus/store gateway', () => {
  it('keeps dummy billing explicit and sends the server-owned amount', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'd1000000-0000-4000-8000-000000000001', amountRupiah: '20000', method: 'qris', mode: 'dummy', status: 'pending', expiresAt: '2026-09-12T03:00:00.000Z' }, error: null });
    const gateway = createSupabaseStoreGateway({ rpc } as never);
    const invoice = await gateway.createBillingOrder('qris');
    expect(invoice.amountRupiah).toBe('20000');
    expect(rpc).toHaveBeenCalledWith('create_plus_billing_order', { p_method: 'qris' });
  });
});
