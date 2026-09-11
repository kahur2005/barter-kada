import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { processListingMedia, type ListingMediaDependencies } from './listing-media';

function dependencies(): ListingMediaDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('41000000-0000-4000-8000-000000000001'),
    getContext: vi.fn().mockResolvedValue({
      quarantinePath: 'user/asset/source', processedPath: 'user/asset.webp', claimedMimeType: 'image/png', claimedByteSize: 100,
    }),
    download: vi.fn().mockImplementation(() => sharp({ create: { width: 20, height: 10, channels: 3, background: '#fff' } }).png().toBuffer()),
    uploadProcessed: vi.fn().mockResolvedValue(undefined),
    markProcessed: vi.fn().mockResolvedValue(undefined),
    removeQuarantined: vi.fn().mockResolvedValue(undefined),
    markRejected: vi.fn().mockResolvedValue(undefined),
  };
}

describe('listing media endpoint boundary', () => {
  it('requires a bearer token before reading an asset', async () => {
    const deps = dependencies();
    const result = await processListingMedia({ authorization: null, assetId: '43000000-0000-4000-8000-000000000003' }, deps);
    expect(result.status).toBe(401);
    expect(deps.getContext).not.toHaveBeenCalled();
  });

  it('authenticates ownership and commits only normalized output', async () => {
    const deps = dependencies();
    const result = await processListingMedia({ authorization: 'Bearer token', assetId: '43000000-0000-4000-8000-000000000003' }, deps);

    expect(result).toEqual({ status: 200, body: { assetId: '43000000-0000-4000-8000-000000000003' } });
    expect(deps.getContext).toHaveBeenCalledWith('43000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-000000000001');
    expect(deps.uploadProcessed).toHaveBeenCalledWith('user/asset.webp', expect.any(Buffer), 'image/webp');
    expect(deps.markProcessed).toHaveBeenCalledWith(expect.objectContaining({ width: 20, height: 10, contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(deps.removeQuarantined).toHaveBeenCalledWith('user/asset/source');
  });
});
