import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { processProfileAvatar, type ProfileAvatarDependencies } from './profile-avatar';

function dependencies(): ProfileAvatarDependencies {
  return {
    authenticate: vi.fn().mockResolvedValue('41000000-0000-4000-8000-000000000001'),
    uploadAvatar: vi.fn().mockResolvedValue('https://example.test/avatars/avatar.webp'),
    deleteAvatar: vi.fn().mockResolvedValue(undefined),
    updateUserMetadata: vi.fn().mockResolvedValue(undefined),
  };
}

describe('profile avatar endpoint boundary', () => {
  it('requires an authorization header', async () => {
    const deps = dependencies();
    const result = await processProfileAvatar({ authorization: null, method: 'POST' }, deps);
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'AUTH_REQUIRED' });
    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated tokens', async () => {
    const deps = dependencies();
    vi.mocked(deps.authenticate).mockResolvedValueOnce(null);
    const result = await processProfileAvatar({ authorization: 'Bearer bad-token', method: 'POST' }, deps);
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'AUTH_INVALID' });
  });

  it('rejects requests without an image file', async () => {
    const deps = dependencies();
    const result = await processProfileAvatar({ authorization: 'Bearer token', method: 'POST' }, deps);
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'FILE_REQUIRED' });
  });

  it('processes, uploads avatar and updates user metadata', async () => {
    const deps = dependencies();
    const pngBuffer = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#f00' } }).png().toBuffer();

    const result = await processProfileAvatar({
      authorization: 'Bearer token',
      method: 'POST',
      fileBuffer: pngBuffer,
      mimeType: 'image/png',
    }, deps);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true, avatarUrl: 'https://example.test/avatars/avatar.webp' });
    expect(deps.uploadAvatar).toHaveBeenCalledWith('41000000-0000-4000-8000-000000000001/avatar.webp', expect.any(Buffer), 'image/webp');
    expect(deps.updateUserMetadata).toHaveBeenCalledWith('41000000-0000-4000-8000-000000000001', 'https://example.test/avatars/avatar.webp');
  });

  it('handles avatar deletion', async () => {
    const deps = dependencies();
    const result = await processProfileAvatar({
      authorization: 'Bearer token',
      method: 'DELETE',
    }, deps);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true, avatarUrl: null });
    expect(deps.deleteAvatar).toHaveBeenCalledWith('41000000-0000-4000-8000-000000000001/avatar.webp');
    expect(deps.updateUserMetadata).toHaveBeenCalledWith('41000000-0000-4000-8000-000000000001', null);
  });
});
