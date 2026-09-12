import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { processChatMedia, type ChatMediaDependencies } from './chat-media';

function dependencies(): ChatMediaDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('41000000-0000-4000-8000-000000000001'),
    getContext: vi.fn().mockResolvedValue({ quarantinePath: 'user/asset/source', processedPath: 'user/asset.webp' }),
    download: vi.fn().mockImplementation(() => sharp({ create: { width: 20, height: 10, channels: 3, background: '#fff' } }).png().toBuffer()),
    uploadProcessed: vi.fn().mockResolvedValue(undefined), markProcessed: vi.fn().mockResolvedValue(undefined),
    removeQuarantined: vi.fn().mockResolvedValue(undefined), markRejected: vi.fn().mockResolvedValue(undefined),
  };
}

describe('chat media endpoint boundary', () => {
  it('requires an authenticated owner before reading quarantined media', async () => {
    const deps = dependencies();
    const result = await processChatMedia({ authorization: null, assetId: '43000000-0000-4000-8000-000000000003' }, deps);
    expect(result).toEqual({ status: 401, body: { error: 'AUTH_REQUIRED' } });
    expect(deps.getContext).not.toHaveBeenCalled();
  });

  it('commits only sanitized WebP output and removes the source', async () => {
    const deps = dependencies();
    const result = await processChatMedia({ authorization: 'Bearer token', assetId: '43000000-0000-4000-8000-000000000003' }, deps);
    expect(result).toEqual({ status: 200, body: { assetId: '43000000-0000-4000-8000-000000000003' } });
    expect(deps.uploadProcessed).toHaveBeenCalledWith('user/asset.webp', expect.any(Buffer), 'image/webp');
    expect(deps.markProcessed).toHaveBeenCalledWith(expect.objectContaining({ contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(deps.removeQuarantined).toHaveBeenCalledWith('user/asset/source');
  });
});
