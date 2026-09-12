import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['message', 'barter', 'order', 'payment', 'handover', 'report', 'plus', 'review', 'system']),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  href: z.string().regex(/^\//),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationPage = { items: Notification[]; nextCursor: string | null };
