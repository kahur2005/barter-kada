import { describe, expect, it, vi } from 'vitest';
import { createSupabaseReviewGateway } from './gateway';

describe('review gateway', () => {
  it('submits only the transaction reference and rating/comment', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'f3000000-0000-4000-8000-000000000003', status: 'published' }, error: null });
    const gateway = createSupabaseReviewGateway({ rpc } as never);
    await gateway.submit({ kind: 'order', transactionId: 'f4000000-0000-4000-8000-000000000004', rating: 5, comment: 'Komunikasi jelas dan tepat waktu.' });
    expect(rpc).toHaveBeenCalledWith('submit_review', { p_transaction_kind: 'order', p_transaction_id: 'f4000000-0000-4000-8000-000000000004', p_rating: 5, p_comment: 'Komunikasi jelas dan tepat waktu.' });
  });
});
