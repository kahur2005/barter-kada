import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminProvider } from './AdminContext';
import { AdminSettingsLimitsPage } from './AdminSettingsLimitsPage';
import type { AdminGateway } from './gateway';

it('requires an explicit before/after confirmation before changing limits', async () => {
  const gateway: AdminGateway = {
    listReports: vi.fn(), getReport: vi.fn(), decide: vi.fn(),
    getPlanSettings: vi.fn().mockResolvedValue({ version: 2, personalActiveLimit: 20, storeProductActiveLimit: 100, maxStores: 3, plusPriceRupiah: '20000', personalActiveCount: 4, storeProductActiveCount: 8, personalOverLimitOwners: 0, storeOverLimitStores: 0 }),
    updatePlanLimits: vi.fn().mockResolvedValue({ version: 3, personalActiveLimit: 25, storeProductActiveLimit: 120, maxStores: 3, plusPriceRupiah: '20000', personalActiveCount: 4, storeProductActiveCount: 8, personalOverLimitOwners: 0, storeOverLimitStores: 0 }),
    listPlanSettingsHistory: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminProvider gateway={gateway}><MemoryRouter><AdminSettingsLimitsPage /></MemoryRouter></AdminProvider></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Batas listing' })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Batas listing pribadi'), { target: { value: '25' } });
  fireEvent.change(screen.getByLabelText('Batas produk aktif per toko'), { target: { value: '120' } });
  fireEvent.change(screen.getByLabelText('Alasan perubahan'), { target: { value: 'Menyesuaikan kapasitas pilot Jabodetabek.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan batas baru' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Konfirmasi ringkasan');
  expect(gateway.updatePlanLimits).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Saya memahami perubahan ini tidak menghapus listing lama.'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan batas baru' }));
  await waitFor(() => expect(gateway.updatePlanLimits).toHaveBeenCalledWith(expect.objectContaining({ personalActiveLimit: 25, storeProductActiveLimit: 120 })));
});
