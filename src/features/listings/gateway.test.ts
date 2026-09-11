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
});
