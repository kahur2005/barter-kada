import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReviewProvider } from './ReviewContext';
import { ReviewListPage } from './ReviewListPage';
import type { ReviewGateway } from './gateway';

it('shows a public review and lets the subject reply once', async () => {
  const gateway: ReviewGateway = {
    submit: vi.fn(),
    list: vi.fn().mockResolvedValue({ items: [{ id: 'f3000000-0000-4000-8000-000000000003', kind: 'order', transactionId: 'f4000000-0000-4000-8000-000000000004', authorName: 'Rina', rating: 5, comment: 'Jelas.', createdAt: '2026-09-12T03:00:00.000Z', reply: null, canReply: true }], nextCursor: null }),
    listStore: vi.fn(),
    reply: vi.fn().mockResolvedValue({ id: 'f5000000-0000-4000-8000-000000000005', body: 'Terima kasih.', createdAt: '2026-09-12T04:00:00.000Z' }),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ReviewProvider gateway={gateway}><MemoryRouter initialEntries={['/reviews?subjectId=f6000000-0000-4000-8000-000000000006']}><ReviewListPage /></MemoryRouter></ReviewProvider></QueryClientProvider>);
  expect(await screen.findByText('Jelas.')).toBeVisible();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Balas ulasan' }));
  await user.type(screen.getByLabelText('Balasan'), 'Terima kasih.');
  await user.click(screen.getByRole('button', { name: 'Balas' }));
  expect(gateway.reply).toHaveBeenCalledWith('f3000000-0000-4000-8000-000000000003', 'Terima kasih.');
});
