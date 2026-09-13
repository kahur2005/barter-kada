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

  it('accepts an active Plus status with a Supabase timestamptz offset', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { priceRupiah: '20000', maxStores: 3, active: true, paidThrough: '2026-10-12T00:00:00+00:00', storeCount: 0 }, error: null });
    const gateway = createSupabaseStoreGateway({ rpc } as never);

    await expect(gateway.getPlusStatus()).resolves.toMatchObject({ active: true, paidThrough: '2026-10-12T00:00:00+00:00' });
  });

  it('updates a store profile through the owner-scoped RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'd1000000-0000-4000-8000-000000000002', slug: 'dapur-rina', name: 'Dapur Rina Baru', description: 'Menu baru.', category: 'Makanan', areaLabel: 'Depok', status: 'active' }, error: null });
    const gateway = createSupabaseStoreGateway({ rpc } as never);
    const input = { slug: 'dapur-rina', name: 'Dapur Rina Baru', description: 'Menu baru.', category: 'Makanan', areaId: 'depok', areaLabel: 'Depok', operatingHours: 'Setiap hari', handoverMethods: ['pickup'], publicAddress: 'Jalan contoh', publicAddressConsent: true };
    await gateway.updateStore('d1000000-0000-4000-8000-000000000001', input);
    expect(rpc).toHaveBeenCalledWith('update_store', { p_store_id: 'd1000000-0000-4000-8000-000000000001', p_name: input.name, p_description: input.description, p_category: input.category, p_area_id: input.areaId, p_area_label: input.areaLabel, p_operating_hours: input.operatingHours, p_handover_methods: input.handoverMethods, p_public_address: input.publicAddress, p_public_address_consent: input.publicAddressConsent });
  });

  it('accepts Supabase timestamptz offsets in owned store summaries', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: 'd1000000-0000-4000-8000-000000000003', slug: 'dapur-rina', name: 'Dapur Rina', description: 'Menu rumahan.', category: 'Makanan', areaLabel: 'Depok', status: 'active', updatedAt: '2026-09-12T06:00:00+00:00' }], error: null });
    const gateway = createSupabaseStoreGateway({ rpc } as never);

    await expect(gateway.getMyStores()).resolves.toHaveLength(1);
  });
});
