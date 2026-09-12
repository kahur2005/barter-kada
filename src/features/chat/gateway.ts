import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ChatMessage, ConversationSummary } from './types';

const messageSchema: z.ZodType<ChatMessage> = z.object({
  id: z.string().uuid(), seq: z.number().int().positive(), senderId: z.string().uuid().nullable(),
  type: z.enum(['text', 'image', 'listing', 'transaction', 'system']), transactionId: z.string().uuid().nullable(),
  body: z.object({ text: z.string().optional(), imagePaths: z.array(z.string()).optional(), imageUrls: z.array(z.string()).optional(), event: z.string().optional() }), sentAt: z.string().datetime(),
});
const summarySchema: z.ZodType<ConversationSummary> = z.object({
  id: z.string().uuid(), listing: z.object({ id: z.string().uuid(), title: z.string(), imagePath: z.string().nullable() }),
  counterpart: z.object({ id: z.string().uuid(), name: z.string(), storeName: z.string().nullable() }),
  lastMessage: z.object({ text: z.string(), sentAt: z.string().datetime(), senderId: z.string().uuid().nullable() }).nullable(),
  unreadCount: z.number().int().nonnegative(),
});

export interface ChatGateway {
  openConversation(listingId: string): Promise<string>;
  listConversations(): Promise<ConversationSummary[]>;
  listMessages(conversationId: string, beforeSeq?: number | null): Promise<{ items: ChatMessage[]; hasMore: boolean; counterpartLastRead: number }>;
  sendText(conversationId: string, text: string, clientMessageId: string): Promise<ChatMessage>;
  sendImages(conversationId: string, files: File[], clientMessageId: string, onProgress: (percent: number) => void): Promise<ChatMessage>;
  markRead(conversationId: string, lastReadSeq: number): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  subscribe(conversationId: string, onCommittedChange: () => void): () => void;
}

const failure = () => new Error('Layanan percakapan belum dapat memproses permintaan.');
export function createSupabaseChatGateway(client: SupabaseClient): ChatGateway {
  async function signImagePaths(items: ChatMessage[]): Promise<ChatMessage[]> {
    const paths = [...new Set(items.flatMap(item => item.body.imagePaths ?? []))];
    if (!paths.length) return items;
    const { data, error } = await client.storage.from('chat-media').createSignedUrls(paths, 60);
    if (error || !data || data.some(item => !item.signedUrl)) throw failure();
    const urls = new Map(paths.map((path, index) => [path, data[index]?.signedUrl ?? '']));
    return items.map(item => item.body.imagePaths ? { ...item, body: { ...item.body, imageUrls: item.body.imagePaths.map(path => urls.get(path) ?? '') } } : item);
  }
  return {
    async openConversation(listingId) {
      const { data, error } = await client.rpc('open_conversation', { p_listing_id: listingId });
      const parsed = z.object({ conversationId: z.string().uuid() }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data.conversationId;
    },
    async listConversations() {
      const { data, error } = await client.rpc('list_conversations');
      const parsed = z.array(summarySchema).safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
    async listMessages(conversationId, beforeSeq = null) {
      const { data, error } = await client.rpc('list_messages', { p_conversation_id: conversationId, p_before_seq: beforeSeq, p_limit: 50 });
      const parsed = z.object({ items: z.array(messageSchema), hasMore: z.boolean(), counterpartLastRead: z.number().int().nonnegative() }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return { ...parsed.data, items: await signImagePaths(parsed.data.items) };
    },
    async sendText(conversationId, text, clientMessageId) {
      const { data, error } = await client.rpc('send_message', { p_conversation_id: conversationId, p_client_message_id: clientMessageId, p_type: 'text', p_body: { text }, p_transaction_id: null });
      const parsed = messageSchema.safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
    async sendImages(conversationId, files, clientMessageId, onProgress) {
      if (files.length < 1 || files.length > 4 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024)) throw failure();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw failure();
      const assetIds: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const { data, error } = await client.rpc('reserve_chat_asset', { p_conversation_id: conversationId, p_mime_type: file.type, p_byte_size: file.size });
        const reservation = z.object({ assetId: z.string().uuid(), quarantinePath: z.string().min(1) }).safeParse(data);
        if (error || !reservation.success) throw failure();
        const { error: uploadError } = await client.storage.from('chat-quarantine').upload(reservation.data.quarantinePath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw failure();
        const response = await fetch('/api/chat-media', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: reservation.data.assetId }) });
        if (!response.ok) throw failure();
        const processed = await response.json() as Record<string, unknown>;
        if (processed.assetId !== reservation.data.assetId) throw failure();
        assetIds.push(reservation.data.assetId);
        onProgress(Math.round(((index + 1) / files.length) * 90));
      }
      const { data, error } = await client.rpc('send_chat_images', { p_conversation_id: conversationId, p_client_message_id: clientMessageId, p_asset_ids: assetIds });
      const parsed = messageSchema.safeParse(data);
      if (error || !parsed.success) throw failure();
      onProgress(100);
      return parsed.data;
    },
    async markRead(conversationId, lastReadSeq) {
      const { error } = await client.rpc('mark_conversation_read', { p_conversation_id: conversationId, p_last_read_seq: lastReadSeq });
      if (error) throw failure();
    },
    async blockUser(userId) { const { error } = await client.rpc('block_user', { p_blocked_id: userId }); if (error) throw failure(); },
    async unblockUser(userId) { const { error } = await client.rpc('unblock_user', { p_blocked_id: userId }); if (error) throw failure(); },
    subscribe(conversationId, onCommittedChange) {
      const channel = client.channel(`conversation:${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, onCommittedChange).subscribe();
      return () => { void client.removeChannel(channel); };
    },
  };
}
