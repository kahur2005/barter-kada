import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ReviewInput, ReviewResult } from './types';

export interface ReviewGateway { submit(input: ReviewInput): Promise<ReviewResult>; }

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
      const parsed = z.object({ id: z.string().uuid(), status: z.literal('published') }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
  };
}
