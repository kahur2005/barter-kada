import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseListingGateway } from './gateway';

describe('Supabase listing media gateway', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('reserves, uploads, and asks the trusted processor to normalize an image', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { assetId: '43000000-0000-4000-8000-000000000003', quarantinePath: 'user/asset/source' },
      error: null,
    });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const client = {
      rpc,
      storage: { from: vi.fn(() => ({ upload })) },
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'user-token' } } }) },
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ assetId: '43000000-0000-4000-8000-000000000003' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const progress: number[] = [];

    const assetId = await createSupabaseListingGateway(client as never).uploadImage(
      new File(['image'], 'food.png', { type: 'image/png' }),
      value => progress.push(value),
    );

    expect(rpc).toHaveBeenCalledWith('reserve_listing_asset', { p_mime_type: 'image/png', p_byte_size: 5 });
    expect(upload).toHaveBeenCalledWith('user/asset/source', expect.any(File), { contentType: 'image/png', upsert: false });
    expect(fetcher).toHaveBeenCalledWith('/api/listing-media', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer user-token' }),
    }));
    expect(assetId).toBe('43000000-0000-4000-8000-000000000003');
    expect(progress).toEqual([10, 60, 100]);
  });

  it('loads an owner draft without manufacturing absent data', async () => {
    const draft = {
      listingId: '43000000-0000-4000-8000-000000000003', expectedVersion: 4,
      publisher: { kind: 'personal' }, modes: ['sale'], fulfillment: 'ready_stock', categoryId: 'home',
      title: 'Meja kecil', description: 'Meja kayu untuk dipakai tetangga.', condition: 'good', defects: 'Gores ringan.',
      negotiable: true, barter: null, basePriceRupiah: '150000', variants: [], assetIds: [], handoverMethods: ['meetup'], preorder: null, catering: null,
    };
    const client = { rpc: vi.fn().mockResolvedValue({ data: draft, error: null }) };
    await expect(createSupabaseListingGateway(client as never).getMine(draft.listingId)).resolves.toEqual(draft);
    expect(client.rpc).toHaveBeenCalledWith('get_my_listing', { p_listing_id: draft.listingId });
  });

  it('serializes Jabodetabek datetime-local values with an explicit offset', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { listingId: '43000000-0000-4000-8000-000000000003', version: 1, lifecycle: 'active' }, error: null });
    const client = { rpc };
    await createSupabaseListingGateway(client as never).publish({
      listingId: null, expectedVersion: null, publisher: { kind: 'personal' }, modes: ['sale'], fulfillment: 'preorder', categoryId: 'food', title: 'Nasi kotak', description: 'Masakan rumahan yang siap dipesan.', condition: null, defects: '', negotiable: false, barter: null, basePriceRupiah: '25000', variants: [], assetIds: [], handoverMethods: ['pickup'],
      preorder: { orderClosesAt: '2026-09-20T10:00', fulfillmentAt: '2026-09-21T12:30', minimumQty: '10', quotaMode: 'unlimited', sharedQuota: null, dpPercent: '50' }, catering: null,
    });
    const payload = vi.mocked(rpc).mock.calls[0][1] as { p_payload: { preorder: { orderClosesAt: string; fulfillmentAt: string } } };
    expect(payload.p_payload.preorder).toMatchObject({ orderClosesAt: '2026-09-20T03:00:00.000Z', fulfillmentAt: '2026-09-21T05:30:00.000Z' });
  });
});
