import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TransactionProvider } from './TransactionContext';
import { TransactionsPage } from './TransactionsPage';
import type { TransactionGateway } from './gateway';

it('renders participant-scoped transaction summaries', async () => {
  const gateway: TransactionGateway = { list: vi.fn().mockResolvedValue([{ id: 'f1000000-0000-4000-8000-000000000001', kind: 'barter', lifecycle: 'negotiating', counterpartName: 'Dita', title: 'Jaket dan rak', href: '/transactions/f1000000-0000-4000-8000-000000000001', updatedAt: '2026-09-12T03:00:00.000Z' }]) };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TransactionProvider gateway={gateway}><MemoryRouter><TransactionsPage /></MemoryRouter></TransactionProvider></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Transaksi saya' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jaket dan rak' })).toBeVisible();
  expect(screen.getByText('Barter · Sedang dinegosiasikan')).toBeVisible();
});
