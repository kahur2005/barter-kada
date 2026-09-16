import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_SIZE = 400;

export type ProfileAvatarDependencies = {
  authenticate(token: string): Promise<string | null>;
  uploadAvatar(path: string, body: Buffer, mimeType: string): Promise<string>;
  deleteAvatar(path: string): Promise<void>;
  updateUserMetadata(userId: string, avatarUrl: string | null): Promise<void>;
};

export async function processProfileAvatar(
  input: {
    authorization: string | null;
    method: string;
    fileBuffer?: Buffer;
    mimeType?: string;
  },
  dependencies: ProfileAvatarDependencies,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const match = input.authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return { status: 401, body: { error: 'AUTH_REQUIRED' } };

  const actorId = await dependencies.authenticate(match[1]);
  if (!actorId) return { status: 401, body: { error: 'AUTH_INVALID' } };

  const avatarPath = `${actorId}/avatar.webp`;

  if (input.method === 'DELETE') {
    await dependencies.deleteAvatar(avatarPath);
    await dependencies.updateUserMetadata(actorId, null);
    return { status: 200, body: { success: true, avatarUrl: null } };
  }

  if (input.method !== 'POST') {
    return { status: 405, body: { error: 'METHOD_NOT_ALLOWED' } };
  }

  if (!input.fileBuffer || input.fileBuffer.byteLength === 0) {
    return { status: 400, body: { error: 'FILE_REQUIRED' } };
  }

  if (input.fileBuffer.byteLength > MAX_AVATAR_BYTES) {
    return { status: 422, body: { error: 'FILE_TOO_LARGE' } };
  }

  let processedBuffer: Buffer;
  try {
    processedBuffer = await sharp(input.fileBuffer, { failOn: 'warning', limitInputPixels: 50_000_000 })
      .rotate()
      .resize({
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch {
    return { status: 422, body: { error: 'IMAGE_INVALID_OR_UNSUPPORTED' } };
  }

  const avatarUrl = await dependencies.uploadAvatar(avatarPath, processedBuffer, 'image/webp');
  await dependencies.updateUserMetadata(actorId, avatarUrl);

  return {
    status: 200,
    body: { success: true, avatarUrl },
  };
}

function requiredEnvironment(name: string, legacy?: string): string {
  const value = process.env[name] ?? (legacy ? process.env[legacy] : undefined);
  if (!value) throw new Error(`Missing server environment: ${name}`);
  return value;
}

function createDependencies(): ProfileAvatarDependencies {
  const url = requiredEnvironment('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const publishableKey = requiredEnvironment('SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  const secretKey = requiredEnvironment('SUPABASE_SECRET_KEY');
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async authenticate(token: string) {
      const verifier = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await verifier.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    },
    async uploadAvatar(path: string, body: Buffer, mimeType: string) {
      const { error } = await admin.storage.from('avatars').upload(path, body, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message}`);
      const { data } = admin.storage.from('avatars').getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    },
    async deleteAvatar(path: string) {
      await admin.storage.from('avatars').remove([path]);
    },
    async updateUserMetadata(userId: string, avatarUrl: string | null) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { avatar_url: avatarUrl },
      });
      await admin.from('profiles').update({ avatar_asset_id: null, updated_at: new Date().toISOString() }).eq('id', userId);
    },
  };
}

async function readRawBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += value.byteLength;
    if (length > MAX_AVATAR_BYTES + 1024 * 1024) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');

  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'POST' && method !== 'DELETE') {
    response.statusCode = 405;
    response.setHeader('Allow', 'POST, DELETE');
    response.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  try {
    let fileBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    if (method === 'POST') {
      const contentType = request.headers['content-type'] ?? '';
      const raw = await readRawBody(request);

      if (contentType.includes('application/json')) {
        const json = JSON.parse(raw.toString('utf-8'));
        if (typeof json.image === 'string') {
          // Supports base64 data URL: data:image/png;base64,... or plain base64
          const match = json.image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            fileBuffer = Buffer.from(match[2], 'base64');
          } else {
            fileBuffer = Buffer.from(json.image, 'base64');
          }
        }
      } else {
        // Direct binary upload
        fileBuffer = raw;
        mimeType = contentType;
      }
    }

    const result = await processProfileAvatar(
      {
        authorization: typeof request.headers.authorization === 'string' ? request.headers.authorization : null,
        method,
        fileBuffer,
        mimeType,
      },
      createDependencies(),
    );

    response.statusCode = result.status;
    response.end(JSON.stringify(result.body));
  } catch (err) {
    response.statusCode = 500;
    response.end(JSON.stringify({ error: 'AVATAR_SERVICE_UNAVAILABLE', details: err instanceof Error ? err.message : String(err) }));
  }
}
