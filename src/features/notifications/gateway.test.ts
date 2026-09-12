import { describe, expect, it, vi } from 'vitest';
import { createSupabaseNotificationGateway } from './gateway';

const item = { id: 'f1000000-0000-4000-8000-000000000001', kind: 'message', title: 'Pesan baru', body: 'Ada pesan baru.', href: '/chat/f2000000-0000-4000-8000-000000000002', readAt: null, createdAt: '2026-09-12T03:00:00.000Z' };

describe('notification gateway', () => {
  it('lists a server-owned notification page and marks one item read', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { items: [item], nextCursor: null }, error: null })
      .mockResolvedValueOnce({ data: { readAt: '2026-09-12T03:01:00.000Z' }, error: null });
    const gateway = createSupabaseNotificationGateway({ rpc } as never);
    await expect(gateway.list({ cursor: null, limit: 20 })).resolves.toEqual({ items: [item], nextCursor: null });
    await gateway.markRead(item.id);
    expect(rpc).toHaveBeenNthCalledWith(1, 'list_notifications', { p_cursor: null, p_limit: 20 });
    expect(rpc).toHaveBeenNthCalledWith(2, 'mark_notification_read', { p_notification_id: item.id });
  });
});
