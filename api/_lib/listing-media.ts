import { createHash } from 'node:crypto';
import sharp, { type Metadata, type OutputInfo } from 'sharp';

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LISTING_IMAGE_EDGE = 2_048;

export type ProcessedListingImage = {
  body: Buffer;
  mimeType: 'image/webp';
  width: number;
  height: number;
  contentHash: string;
};

export async function inspectAndReencodeListingImage(source: Buffer): Promise<ProcessedListingImage> {
  if (source.byteLength > MAX_LISTING_IMAGE_BYTES) throw new Error('MEDIA_TOO_LARGE');

  let metadata: Metadata;
  try {
    metadata = await sharp(source, { failOn: 'warning', limitInputPixels: 144_000_000 }).metadata();
  } catch {
    throw new Error('MEDIA_TYPE_UNSUPPORTED');
  }
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('MEDIA_TYPE_UNSUPPORTED');

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(source, { failOn: 'warning', limitInputPixels: 144_000_000 })
      .rotate()
      .resize({ width: MAX_LISTING_IMAGE_EDGE, height: MAX_LISTING_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error('MEDIA_PROCESSING_FAILED');
  }
  if (!output.info.width || !output.info.height) throw new Error('MEDIA_PROCESSING_FAILED');

  return {
    body: output.data,
    mimeType: 'image/webp',
    width: output.info.width,
    height: output.info.height,
    contentHash: createHash('sha256').update(output.data).digest('hex'),
  };
}
