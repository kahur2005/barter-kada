import { describe, expect, it, vi } from 'vitest';
import { createSupabaseReviewGateway } from './gateway';

describe('review gateway', () => {
  it('submits only the transaction reference and rating/comment', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'f3000000-0000-4000-8000-000000000003', status: 'published' }, error: null });
    const gateway = createSupabaseReviewGateway({ rpc } as never);
    await gateway.submit({ kind: 'order', transactionId: 'f4000000-0000-4000-8000-000000000004', rating: 5, comment: 'Komunikasi jelas dan tepat waktu.' });
    expect(rpc).toHaveBeenCalledWith('submit_review', { p_transaction_kind: 'order', p_transaction_id: 'f4000000-0000-4000-8000-000000000004', p_rating: 5, p_comment: 'Komunikasi jelas dan tepat waktu.' });
  });

  it('keeps public review listing and replies on scoped RPCs', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { items: [{ id: 'f3000000-0000-4000-8000-000000000003', kind: 'order', transactionId: 'f4000000-0000-4000-8000-000000000004', authorName: 'Rina', rating: 5, comment: 'Jelas.', createdAt: '2026-09-12T03:00:00.000Z', reply: null, canReply: true }], nextCursor: null }, error: null })
      .mockResolvedValueOnce({ data: { id: 'f5000000-0000-4000-8000-000000000005', reviewId: 'f3000000-0000-4000-8000-000000000003', body: 'Terima kasih.', createdAt: '2026-09-12T04:00:00.000Z' }, error: null });
    const gateway = createSupabaseReviewGateway({ rpc } as never);
    await gateway.list('f6000000-0000-4000-8000-000000000006', null);
    await gateway.reply('f3000000-0000-4000-8000-000000000003', 'Terima kasih.');
    expect(rpc).toHaveBeenNthCalledWith(1, 'list_reviews', { p_subject_id: 'f6000000-0000-4000-8000-000000000006', p_cursor: null, p_limit: 20 });
    expect(rpc).toHaveBeenNthCalledWith(2, 'reply_review', { p_review_id: 'f3000000-0000-4000-8000-000000000003', p_body: 'Terima kasih.' });
  });

  it('loads store-scoped reviews separately from owner reviews', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { items: [], nextCursor: null }, error: null });
    const gateway = createSupabaseReviewGateway({ rpc } as never);
    await gateway.listStore('f7000000-0000-4000-8000-000000000007', null);
    expect(rpc).toHaveBeenCalledWith('list_store_reviews', { p_store_id: 'f7000000-0000-4000-8000-000000000007', p_cursor: null, p_limit: 20 });
  });
});
