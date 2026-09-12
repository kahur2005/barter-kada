import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from './NotificationContext';
import { NotificationsPage } from './NotificationsPage';
import type { NotificationGateway } from './gateway';

const item = { id: 'f1000000-0000-4000-8000-000000000001', kind: 'message' as const, title: 'Pesan baru', body: 'Kamu menerima pesan baru.', href: '/chat/f2000000-0000-4000-8000-000000000002', readAt: null, createdAt: '2026-09-12T03:00:00.000Z' };

function show(gateway: NotificationGateway) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><NotificationProvider gateway={gateway}><MemoryRouter><NotificationsPage /></MemoryRouter></NotificationProvider></QueryClientProvider>);
}

describe('notifications page', () => {
  it('shows unread notification and marks it read explicitly', async () => {
    const gateway: NotificationGateway = { list: vi.fn().mockResolvedValue({ items: [item], nextCursor: null }), markRead: vi.fn().mockResolvedValue({ readAt: '2026-09-12T03:01:00.000Z' }) };
    show(gateway);
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Notifikasi' })).toBeVisible();
    expect(screen.getByText('Pesan baru')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tandai sudah dibaca' }));
    expect(gateway.markRead).toHaveBeenCalledWith(item.id);
  });
});
