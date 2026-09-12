import { z } from 'zod';

export const reviewInputSchema = z.object({
  kind: z.enum(['barter', 'order']),
  transactionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewResult = { id: string; status: 'published' };
