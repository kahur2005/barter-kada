import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TransactionProvider } from './TransactionContext';
import { TransactionsPage } from './TransactionsPage';
import type { TransactionGateway } from './gateway';

it('renders participant-scoped transaction summaries', async () => {
  const gateway: TransactionGateway = { list: vi.fn().mockResolvedValue([{ id: 'f1000000-0000-4000-8000-000000000001', kind: 'barter', lifecycle: 'negotiating', bucket: 'needs_action', actionRequired: true, actorRole: 'party_b', counterpartName: 'Dita', publisherKind: 'store', publisherName: 'Dapur Dita', title: 'Jaket dan rak', href: '/transactions/f1000000-0000-4000-8000-000000000001', updatedAt: '2026-09-12T03:00:00.000Z' }]) };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TransactionProvider gateway={gateway}><MemoryRouter><TransactionsPage /></MemoryRouter></TransactionProvider></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Transaksi saya' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jaket dan rak' })).toBeVisible();
  expect(screen.getByText('Barter · Sedang dinegosiasikan')).toBeVisible();
});

it('separates action, active, and completed transactions while showing role and publisher', async () => {
  const gateway: TransactionGateway = { list: vi.fn().mockResolvedValue([
    { id: 'f1000000-0000-4000-8000-000000000001', kind: 'barter', lifecycle: 'negotiating', bucket: 'needs_action', actionRequired: true, actorRole: 'party_b', counterpartName: 'Dita', publisherKind: 'store', publisherName: 'Dapur Dita', title: 'Jaket dan rak', href: '/transactions/f1000000-0000-4000-8000-000000000001', updatedAt: '2026-09-12T03:00:00.000Z' },
    { id: 'f1000000-0000-4000-8000-000000000002', kind: 'order', lifecycle: 'processing', bucket: 'in_progress', actionRequired: false, actorRole: 'buyer', counterpartName: 'Rani', publisherKind: 'personal', publisherName: 'Rani Kitchen', title: 'Nasi box', href: '/orders/f1000000-0000-4000-8000-000000000002', updatedAt: '2026-09-12T02:00:00.000Z' },
    { id: 'f1000000-0000-4000-8000-000000000003', kind: 'order', lifecycle: 'completed', bucket: 'completed', actionRequired: false, actorRole: 'seller', counterpartName: 'Budi', publisherKind: 'store', publisherName: 'Rani Kitchen', title: 'Paket katering', href: '/orders/f1000000-0000-4000-8000-000000000003', updatedAt: '2026-09-12T01:00:00.000Z' },
  ]) };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TransactionProvider gateway={gateway}><MemoryRouter><TransactionsPage /></MemoryRouter></TransactionProvider></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Perlu tindakan' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Berjalan' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Selesai' })).toBeVisible();
  expect(screen.getByText('Pihak B · Penerbit toko · Dapur Dita')).toBeVisible();
  expect(screen.getByText('Pembeli · Penerbit profil pribadi · Rani Kitchen')).toBeVisible();
  expect(screen.getByText('Penjual · Penerbit toko · Rani Kitchen')).toBeVisible();
});

it('keeps the three status sections discoverable when one section is empty', async () => {
  const gateway: TransactionGateway = { list: vi.fn().mockResolvedValue([{ id: 'f1000000-0000-4000-8000-000000000003', kind: 'order', lifecycle: 'completed', bucket: 'completed', actionRequired: false, actorRole: 'seller', counterpartName: 'Budi', publisherKind: 'store', publisherName: 'Rani Kitchen', title: 'Paket katering', href: '/orders/f1000000-0000-4000-8000-000000000003', updatedAt: '2026-09-12T01:00:00.000Z' }]) };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TransactionProvider gateway={gateway}><MemoryRouter><TransactionsPage /></MemoryRouter></TransactionProvider></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Selesai' })).toBeVisible();
  expect(screen.getAllByText('Tidak ada transaksi di bagian ini.')).toHaveLength(2);
});
