import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminProvider } from './AdminContext';
import { AdminReportDetailPage } from './AdminReportDetailPage';
import type { AdminGateway } from './gateway';

const report = { id: 'f1000000-0000-4000-8000-000000000001', targetType: 'order' as const, targetId: 'f2000000-0000-4000-8000-000000000002', reason: 'not_as_described' as const, description: 'Barang yang diterima tidak sesuai kesepakatan.', status: 'open' as const, decisionVersion: 1, createdAt: '2026-09-12T03:00:00.000Z', reporter: { id: 'f3000000-0000-4000-8000-000000000003', name: 'Pelapor' }, context: { title: 'Pesanan 123', href: '/orders/f2000000-0000-4000-8000-000000000002', summary: 'Snapshot order terkait.' }, decision: null };

function show(gateway: AdminGateway) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminProvider gateway={gateway}><MemoryRouter initialEntries={[`/admin/reports/${report.id}`]}><Routes><Route path="/admin/reports/:id" element={<AdminReportDetailPage />} /></Routes></MemoryRouter></AdminProvider></QueryClientProvider>);
}

describe('admin report detail', () => {
  it('requires a return party and deadline for a return decision', async () => {
    const gateway: AdminGateway = { listReports: vi.fn(), getReport: vi.fn().mockResolvedValue(report), decide: vi.fn().mockResolvedValue(report), getPlanSettings: vi.fn(), updatePlanLimits: vi.fn(), listPlanSettingsHistory: vi.fn(), getProductMetrics: vi.fn() };
    show(gateway); const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Outcome'), 'return_required');
    await user.type(screen.getByLabelText('Pihak yang wajib mengembalikan barang'), 'f4000000-0000-4000-8000-000000000004');
    await user.clear(screen.getByLabelText('Tenggat pengembalian')); await user.type(screen.getByLabelText('Tenggat pengembalian'), '2026-09-20T10:00');
    await user.type(screen.getByLabelText('Alasan keputusan'), 'Admin menetapkan barang harus dikembalikan setelah bukti dibandingkan.');
    await user.click(screen.getByRole('button', { name: 'Simpan keputusan' }));
    expect(gateway.decide).toHaveBeenCalledWith(report.id, 1, expect.objectContaining({ outcome: 'return_required', actionUserId: 'f4000000-0000-4000-8000-000000000004', followUpKind: 'return_goods', followUpDueAt: expect.stringMatching(/^2026-09-20T03:00:00\.000Z$/) }));
  });
});
