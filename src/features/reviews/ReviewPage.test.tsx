import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReviewProvider } from './ReviewContext';
import { ReviewPage } from './ReviewPage';
import type { ReviewGateway } from './gateway';

function show(gateway: ReviewGateway) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ReviewProvider gateway={gateway}><MemoryRouter initialEntries={['/reviews/new?kind=order&id=f4000000-0000-4000-8000-000000000004']}><ReviewPage /></MemoryRouter></ReviewProvider></QueryClientProvider>);
}

describe('review page', () => {
  it('requires a rating while allowing an optional comment', async () => {
  const gateway: ReviewGateway = { submit: vi.fn().mockResolvedValue({ id: 'f3000000-0000-4000-8000-000000000003', status: 'published' }), list: vi.fn(), listStore: vi.fn(), reply: vi.fn() };
    show(gateway);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Kirim ulasan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pilih rating 1–5.');
    await user.click(screen.getByRole('radio', { name: '5 dari 5' }));
    await user.click(screen.getByRole('button', { name: 'Kirim ulasan' }));
    expect(gateway.submit).toHaveBeenCalledWith({ kind: 'order', transactionId: 'f4000000-0000-4000-8000-000000000004', rating: 5, comment: '' });
  });
});
