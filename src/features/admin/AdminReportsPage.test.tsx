import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminProvider } from './AdminContext';
import { AdminReportsPage } from './AdminReportsPage';
import type { AdminGateway } from './gateway';

const report = { id: 'f1000000-0000-4000-8000-000000000001', targetType: 'conversation' as const, targetId: 'f2000000-0000-4000-8000-000000000002', reason: 'harassment' as const, description: 'Pesan berulang dan tidak diinginkan.', status: 'open' as const, createdAt: '2026-09-12T03:00:00.000Z', reporter: { id: 'f3000000-0000-4000-8000-000000000003', name: 'Pelapor' }, context: { title: 'Percakapan listing', href: '/chat/f2000000-0000-4000-8000-000000000002' }, decision: null };

it('renders a scoped admin report queue', async () => {
  const gateway: AdminGateway = { listReports: vi.fn().mockResolvedValue({ items: [report], nextCursor: null }), getReport: vi.fn(), decide: vi.fn(), getPlanSettings: vi.fn(), updatePlanLimits: vi.fn(), listPlanSettingsHistory: vi.fn() };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminProvider gateway={gateway}><MemoryRouter><AdminReportsPage /></MemoryRouter></AdminProvider></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Laporan komunitas' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Percakapan listing' })).toBeVisible();
  expect(gateway.listReports).toHaveBeenCalledWith({ status: 'open', cursor: null });
});
