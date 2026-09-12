import { z } from 'zod';

export const reviewInputSchema = z.object({
  kind: z.enum(['barter', 'order']),
  transactionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewResult = { id: string; status: 'pending' | 'published' };
export type ReviewReply = { id: string; body: string; createdAt: string };
export type PublicReview = { id: string; kind: 'barter' | 'order'; transactionId: string; authorName: string; rating: number; comment: string; createdAt: string; reply: ReviewReply | null; canReply: boolean };
export type ReviewPage = { items: PublicReview[]; nextCursor: string | null };
