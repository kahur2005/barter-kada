import { z } from 'zod';

export const transactionBucketSchema = z.enum(['needs_action', 'in_progress', 'completed']);
export const transactionActorRoleSchema = z.enum(['buyer', 'seller', 'party_a', 'party_b']);
export const transactionPublisherKindSchema = z.enum(['personal', 'store']);
export const transactionSummarySchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['barter', 'order']),
  lifecycle: z.string(),
  bucket: transactionBucketSchema,
  actionRequired: z.boolean(),
  actorRole: transactionActorRoleSchema,
  counterpartName: z.string(),
  publisherKind: transactionPublisherKindSchema,
  publisherName: z.string(),
  title: z.string(),
  href: z.string().regex(/^\//),
  updatedAt: z.string().datetime(),
});
export type TransactionSummary = z.infer<typeof transactionSummarySchema>;
