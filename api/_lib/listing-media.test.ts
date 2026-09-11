import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { inspectAndReencodeListingImage } from './listing-media';

describe('listing image processing', () => {
  it('normalizes a supported image to bounded WebP output', async () => {
    const source = await sharp({
      create: { width: 2_400, height: 1_200, channels: 3, background: '#53785d' },
    }).jpeg().withExif({ IFD0: { Copyright: 'private camera note' } }).toBuffer();

    const result = await inspectAndReencodeListingImage(source);
    const metadata = await sharp(result.body).metadata();

    expect(result.mimeType).toBe('image/webp');
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(2_048);
    expect(metadata.height).toBe(1_024);
    expect(metadata.exif).toBeUndefined();
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects non-image payloads even when an upload claimed to be an image', async () => {
    await expect(inspectAndReencodeListingImage(Buffer.from('not really an image'))).rejects.toThrow('MEDIA_TYPE_UNSUPPORTED');
  });

  it('rejects source payloads larger than the product limit', async () => {
    await expect(inspectAndReencodeListingImage(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toThrow('MEDIA_TOO_LARGE');
  });
});
