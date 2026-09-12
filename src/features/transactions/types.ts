import { z } from 'zod';

export const transactionSummarySchema = z.object({
  id: z.string().uuid(), kind: z.enum(['barter', 'order']), lifecycle: z.string(), counterpartName: z.string(), title: z.string(), href: z.string().regex(/^\//), updatedAt: z.string().datetime(),
});
export type TransactionSummary = z.infer<typeof transactionSummarySchema>;
