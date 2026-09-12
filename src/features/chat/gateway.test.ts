import { describe, expect, it, vi } from 'vitest';
import { createSupabaseChatGateway } from './gateway';

describe('Supabase chat gateway', () => {
  it('opens one listing conversation and sends idempotent text commands', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { conversationId: '71000000-0000-4000-8000-000000000001' }, error: null })
      .mockResolvedValueOnce({ data: { id: '72000000-0000-4000-8000-000000000002', seq: 4, senderId: '73000000-0000-4000-8000-000000000003', type: 'text', transactionId: null, body: { text: 'Masih tersedia?' }, sentAt: '2026-09-12T01:00:00.000Z' }, error: null });
    const gateway = createSupabaseChatGateway({ rpc } as never);
    const conversationId = await gateway.openConversation('74000000-0000-4000-8000-000000000004');
    const message = await gateway.sendText(conversationId, 'Masih tersedia?', '75000000-0000-4000-8000-000000000005');
    expect(conversationId).toBe('71000000-0000-4000-8000-000000000001');
    expect(message.seq).toBe(4);
    expect(rpc).toHaveBeenNthCalledWith(2, 'send_message', { p_conversation_id: conversationId, p_client_message_id: '75000000-0000-4000-8000-000000000005', p_type: 'text', p_body: { text: 'Masih tersedia?' }, p_transaction_id: null });
  });

  it('marks only the actor cursor and rejects malformed inbox payloads', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [{ id: 'not-a-uuid' }], error: null });
    const gateway = createSupabaseChatGateway({ rpc } as never);
    await gateway.markRead('71000000-0000-4000-8000-000000000001', 9);
    expect(rpc).toHaveBeenNthCalledWith(1, 'mark_conversation_read', { p_conversation_id: '71000000-0000-4000-8000-000000000001', p_last_read_seq: 9 });
    await expect(gateway.listConversations()).rejects.toThrow(/percakapan/);
  });

  it('quarantines and processes at most four images before committing one image message', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { assetId: '76000000-0000-4000-8000-000000000006', quarantinePath: 'actor/asset-1/source' }, error: null })
      .mockResolvedValueOnce({ data: { assetId: '77000000-0000-4000-8000-000000000007', quarantinePath: 'actor/asset-2/source' }, error: null })
      .mockResolvedValueOnce({ data: { id: '72000000-0000-4000-8000-000000000002', seq: 5, senderId: '73000000-0000-4000-8000-000000000003', type: 'image', transactionId: null, body: { imagePaths: ['actor/asset-1.webp', 'actor/asset-2.webp'] }, sentAt: '2026-09-12T01:00:00.000Z' }, error: null });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'access-token' } } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const assetId = JSON.parse(String(init?.body)).assetId as string;
      return new Response(JSON.stringify({ assetId }), { status: 200 });
    });
    const gateway = createSupabaseChatGateway({ rpc, storage: { from: vi.fn(() => ({ upload })) }, auth: { getSession } } as never);
    const progress = vi.fn();
    const message = await gateway.sendImages(
      '71000000-0000-4000-8000-000000000001',
      [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })],
      '78000000-0000-4000-8000-000000000008',
      progress,
    );
    expect(message.type).toBe('image');
    expect(rpc).toHaveBeenLastCalledWith('send_chat_images', {
      p_conversation_id: '71000000-0000-4000-8000-000000000001',
      p_client_message_id: '78000000-0000-4000-8000-000000000008',
      p_asset_ids: ['76000000-0000-4000-8000-000000000006', '77000000-0000-4000-8000-000000000007'],
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith(100);
    fetchMock.mockRestore();
  });

  it('turns private image paths into short-lived signed URLs when reading history', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { items: [{ id: '72000000-0000-4000-8000-000000000002', seq: 5, senderId: '73000000-0000-4000-8000-000000000003', type: 'image', transactionId: null, body: { imagePaths: ['actor/asset.webp'] }, sentAt: '2026-09-12T01:00:00.000Z' }], hasMore: false, counterpartLastRead: 4 }, error: null });
    const createSignedUrls = vi.fn().mockResolvedValue({ data: [{ signedUrl: 'https://signed.test/asset' }], error: null });
    const gateway = createSupabaseChatGateway({ rpc, storage: { from: vi.fn(() => ({ createSignedUrls })) } } as never);
    const page = await gateway.listMessages('71000000-0000-4000-8000-000000000001');
    expect(createSignedUrls).toHaveBeenCalledWith(['actor/asset.webp'], 60);
    expect(page.items[0].body.imageUrls).toEqual(['https://signed.test/asset']);
  });
});
