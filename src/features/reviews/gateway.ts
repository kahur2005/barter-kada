import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ReviewInput, ReviewPage, ReviewReply, ReviewResult } from './types';

export interface ReviewGateway { submit(input: ReviewInput): Promise<ReviewResult>; list(subjectId: string, cursor: string | null): Promise<ReviewPage>; reply(reviewId: string, body: string): Promise<ReviewReply>; }

const failure = () => new Error('Ulasan belum dapat disimpan.');
export function createSupabaseReviewGateway(client: SupabaseClient): ReviewGateway {
  return {
    async submit(input) {
      const { data, error } = await client.rpc('submit_review', {
        p_transaction_kind: input.kind,
        p_transaction_id: input.transactionId,
        p_rating: input.rating,
        p_comment: input.comment,
      });
      const parsed = z.object({ id: z.string().uuid(), status: z.enum(['pending', 'published']) }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
    async list(subjectId, cursor) {
      const { data, error } = await client.rpc('list_reviews', { p_subject_id: subjectId, p_cursor: cursor, p_limit: 20 });
      const parsed = z.object({ items: z.array(z.object({ id: z.string().uuid(), kind: z.enum(['barter', 'order']), transactionId: z.string().uuid(), authorName: z.string(), rating: z.number().int().min(1).max(5), comment: z.string(), createdAt: z.string().datetime(), reply: z.object({ id: z.string().uuid(), body: z.string(), createdAt: z.string().datetime() }).nullable(), canReply: z.boolean() })), nextCursor: z.string().nullable() }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
    async reply(reviewId, body) {
      const { data, error } = await client.rpc('reply_review', { p_review_id: reviewId, p_body: body });
      const parsed = z.object({ id: z.string().uuid(), reviewId: z.string().uuid(), body: z.string(), createdAt: z.string().datetime() }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return { id: parsed.data.id, body: parsed.data.body, createdAt: parsed.data.createdAt };
    },
  };
}
