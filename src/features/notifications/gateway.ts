import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { notificationSchema, type NotificationPage } from './types';

export interface NotificationGateway {
  list(input: { cursor: string | null; limit?: number }): Promise<NotificationPage>;
  markRead(notificationId: string): Promise<{ readAt: string }>;
}

const failure = () => new Error('Notifikasi belum dapat memproses permintaan.');
const pageSchema = z.object({ items: z.array(notificationSchema), nextCursor: z.string().nullable() });

export function createSupabaseNotificationGateway(client: SupabaseClient): NotificationGateway {
  return {
    async list({ cursor, limit = 20 }) {
      const { data, error } = await client.rpc('list_notifications', { p_cursor: cursor, p_limit: limit });
      const parsed = pageSchema.safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
    async markRead(notificationId) {
      const { data, error } = await client.rpc('mark_notification_read', { p_notification_id: notificationId });
      const parsed = z.object({ readAt: z.string().datetime() }).safeParse(data);
      if (error || !parsed.success) throw failure();
      return parsed.data;
    },
  };
}
