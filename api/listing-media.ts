import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { inspectAndReencodeListingImage } from './_lib/listing-media';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AssetContext = { quarantinePath: string; processedPath: string; claimedMimeType: string; claimedByteSize: number };
type MarkProcessedInput = { assetId: string; actorId: string; processedPath: string; width: number; height: number; contentHash: string };
export type ListingMediaDependencies = {
  authenticate(token: string): Promise<string | null>;
  getContext(assetId: string, actorId: string): Promise<AssetContext | null>;
  download(path: string): Promise<Buffer>;
  uploadProcessed(path: string, body: Buffer, mimeType: string): Promise<void>;
  markProcessed(input: MarkProcessedInput): Promise<void>;
  removeQuarantined(path: string): Promise<void>;
  markRejected(assetId: string, actorId: string): Promise<void>;
};

export async function processListingMedia(
  input: { authorization: string | null; assetId: string },
  dependencies: ListingMediaDependencies,
): Promise<{ status: number; body: Record<string, string> }> {
  const match = input.authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return { status: 401, body: { error: 'AUTH_REQUIRED' } };
  if (!UUID.test(input.assetId)) return { status: 400, body: { error: 'ASSET_ID_INVALID' } };

  const actorId = await dependencies.authenticate(match[1]);
  if (!actorId) return { status: 401, body: { error: 'AUTH_INVALID' } };
  const context = await dependencies.getContext(input.assetId, actorId);
  if (!context) return { status: 404, body: { error: 'ASSET_NOT_FOUND' } };

  try {
    const source = await dependencies.download(context.quarantinePath);
    const processed = await inspectAndReencodeListingImage(source);
    await dependencies.uploadProcessed(context.processedPath, processed.body, processed.mimeType);
    await dependencies.markProcessed({
      assetId: input.assetId,
      actorId,
      processedPath: context.processedPath,
      width: processed.width,
      height: processed.height,
      contentHash: processed.contentHash,
    });
    await dependencies.removeQuarantined(context.quarantinePath);
    return { status: 200, body: { assetId: input.assetId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('MEDIA_')) {
      await dependencies.markRejected(input.assetId, actorId).catch(() => undefined);
      await dependencies.removeQuarantined(context.quarantinePath).catch(() => undefined);
      return { status: 422, body: { error: message } };
    }
    throw error;
  }
}

function requiredEnvironment(name: string, legacy?: string): string {
  const value = process.env[name] ?? (legacy ? process.env[legacy] : undefined);
  if (!value) throw new Error(`Missing server environment: ${name}`);
  return value;
}

function createDependencies(userToken?: string): ListingMediaDependencies {
  const url = requiredEnvironment('SUPABASE_URL');
  const publishableKey = requiredEnvironment('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY');
  const secretKey = requiredEnvironment('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async authenticate(token) {
      const verifier = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await verifier.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    },
    async getContext(assetId, actorId) {
      // If a user token is available, try user-scoped RPC first (bypasses service_role restriction in dev)
      if (userToken) {
        const userClient = createClient(url, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${userToken}` } },
        });
        const { data: userData, error: userError } = await userClient.rpc('get_my_listing_asset_context', { p_asset_id: assetId });
        if (!userError && userData !== null) {
          const value = userData as Record<string, unknown>;
          if (typeof value.quarantinePath === 'string' && typeof value.processedPath === 'string' &&
              typeof value.claimedMimeType === 'string' && typeof value.claimedByteSize === 'number') {
            return value as AssetContext;
          }
        }
      }

      // Standard / production service_role RPC
      const { data, error } = await admin.rpc('get_listing_asset_processing_context', { p_asset_id: assetId, p_actor_id: actorId });
      if (error || !data || typeof data !== 'object') return null;
      const value = data as Record<string, unknown>;
      if (typeof value.quarantinePath !== 'string' || typeof value.processedPath !== 'string' || typeof value.claimedMimeType !== 'string' || typeof value.claimedByteSize !== 'number') return null;
      return value as AssetContext;
    },
    async download(path) {
      const { data, error } = await admin.storage.from('listing-quarantine').download(path);
      if (error || !data) throw new Error('STORAGE_DOWNLOAD_FAILED');
      return Buffer.from(await data.arrayBuffer());
    },
    async uploadProcessed(path, body, mimeType) {
      const { error } = await admin.storage.from('listing-media').upload(path, body, { contentType: mimeType, cacheControl: '31536000', upsert: false });
      if (error) throw new Error('STORAGE_UPLOAD_FAILED');
    },
    async markProcessed(input) {
      if (userToken) {
        const userClient = createClient(url, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${userToken}` } },
        });
        const { error: userError } = await userClient.rpc('mark_my_listing_asset_processed', {
          p_asset_id: input.assetId, p_processed_path: input.processedPath,
          p_width: input.width, p_height: input.height, p_content_hash: input.contentHash,
        });
        if (!userError) return;
      }

      const { error } = await admin.rpc('mark_listing_asset_processed', {
        p_asset_id: input.assetId, p_actor_id: input.actorId, p_processed_path: input.processedPath,
        p_width: input.width, p_height: input.height, p_content_hash: input.contentHash,
      });
      if (error) throw new Error('ASSET_COMMIT_FAILED');
    },
    async removeQuarantined(path) { await admin.storage.from('listing-quarantine').remove([path]); },
    async markRejected(assetId, actorId) {
      if (userToken) {
        const userClient = createClient(url, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${userToken}` } },
        });
        const { error: userError } = await userClient.rpc('reject_my_listing_asset', { p_asset_id: assetId });
        if (!userError) return;
      }
      await admin.rpc('reject_listing_asset', { p_asset_id: assetId, p_actor_id: actorId });
    },
  };
}

async function readJson(request: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === 'object') return request.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += value.byteLength;
    if (length > 4_096) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.setHeader('Allow', 'POST');
    response.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
    return;
  }
  try {
    const authHeader = typeof request.headers.authorization === 'string' ? request.headers.authorization : null;
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const body = await readJson(request);
    const result = await processListingMedia({
      authorization: authHeader,
      assetId: typeof body.assetId === 'string' ? body.assetId : '',
    }, createDependencies(token));
    response.statusCode = result.status;
    response.end(JSON.stringify(result.body));
  } catch {
    response.statusCode = 503;
    response.end(JSON.stringify({ error: 'MEDIA_SERVICE_UNAVAILABLE' }));
  }
}
