import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import type { AuthGateway } from '../auth/types';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { OnboardingGateway } from '../onboarding/types';
import type { ListingGateway } from './gateway';
import type { StoreGateway } from '../stores/gateway';

const repository = createPreviewRepository([], []);
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: '10000000-0000-4000-8000-000000000001', email: 'rina@example.test' }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const onboarding: OnboardingGateway = { getState: vi.fn().mockResolvedValue({ nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: '+62••••7890', phoneVerified: true }), listAreas: vi.fn().mockResolvedValue([{ areaId: 'depok', name: 'Depok' }]), completeProfile: vi.fn(), setLocation: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() };
function gateway(): ListingGateway { return { saveDraft: vi.fn().mockResolvedValue({ listingId: '20000000-0000-4000-8000-000000000002', version: 1, lifecycle: 'draft' }), publish: vi.fn().mockResolvedValue({ listingId: '20000000-0000-4000-8000-000000000002', version: 8, lifecycle: 'active' }), getMine: vi.fn().mockResolvedValue(null), uploadImage: vi.fn().mockResolvedValue('30000000-0000-4000-8000-000000000003'), listMine: vi.fn(), archive: vi.fn() }; }
function show(listingGateway: ListingGateway | null, path = '/listings/new', storeGateway: StoreGateway | null = null) { return render(<MemoryRouter initialEntries={[path]}><App repository={repository} authGateway={auth} onboardingGateway={onboarding} listingGateway={listingGateway} storeGateway={storeGateway} /></MemoryRouter>); }
function storeGateway(): StoreGateway { return { getPlusStatus: vi.fn(), createBillingOrder: vi.fn(), simulateBilling: vi.fn(), createStore: vi.fn(), updateStore: vi.fn(), getMyStores: vi.fn().mockResolvedValue([{ id: '70000000-0000-4000-8000-000000000007', slug: 'dapur-rina', name: 'Dapur Rina', description: 'Menu rumahan.', category: 'Makanan', areaId: 'depok', areaLabel: 'Depok', status: 'active' }]) }; }

describe('listing editor', () => {
  it('shows all four stages and keeps personal publishing independent from Plus', async () => {
    show(gateway());
    expect(await screen.findByRole('heading', { name: 'Pasang penawaran' })).toBeVisible();
    for (const label of ['Penawaran', 'Detail', 'Ketersediaan', 'Tinjau']) expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByText(/Profil pribadi/)).toBeVisible();
    expect(screen.getByText(/Toko adalah fitur Plus/)).toBeVisible();
  });

  it('asks how to handle unsaved listing changes before leaving the editor', async () => {
    const user = userEvent.setup(); show(gateway());
    await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.selectOptions(screen.getByLabelText('Kategori'), 'home');
    await user.click(screen.getByRole('button', { name: 'Lanjut ke detail' }));
    await user.type(screen.getByLabelText('Nama penawaran'), 'Kursi kayu');
    await user.click(screen.getByRole('link', { name: 'Kembali' }));

    expect(await screen.findByRole('heading', { name: 'Simpan perubahan sebelum keluar?' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tetap di editor' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tetap di editor' }));
    expect(screen.getByDisplayValue('Kursi kayu')).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Kembali' }));
    await user.click(screen.getByRole('button', { name: 'Buang perubahan' }));
    expect(await screen.findByRole('heading', { name: 'Penawaran di sekitar' })).toBeVisible();
  });

  it('can save a new listing draft before leaving the editor', async () => {
    const user = userEvent.setup(); const api = gateway(); show(api);
    await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.selectOptions(screen.getByLabelText('Kategori'), 'home');
    await user.click(screen.getByRole('button', { name: 'Lanjut ke detail' }));
    await user.type(screen.getByLabelText('Nama penawaran'), 'Rak buku');
    await user.click(screen.getByRole('link', { name: 'Kembali' }));
    await user.click(screen.getByRole('button', { name: 'Simpan draft & keluar' }));

    expect(api.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rak buku' }));
    expect(await screen.findByRole('heading', { name: 'Penawaran di sekitar' })).toBeVisible();
  });

  it('saves an incomplete draft through the server without claiming publication', async () => {
    const user = userEvent.setup(); const api = gateway(); show(api);
    await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.click(screen.getByRole('button', { name: 'Simpan draft' }));
    expect(api.saveDraft).toHaveBeenCalledOnce();
    expect(await screen.findByRole('status')).toHaveTextContent('Draft tersimpan');
    expect(screen.queryByText(/sudah terbit/i)).not.toBeInTheDocument();
  });

  it('explains incompatible PO/barter choices and retains the selection', async () => {
    const user = userEvent.setup(); show(gateway()); await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.selectOptions(screen.getByLabelText('Bentuk pemenuhan'), 'preorder');
    await user.click(screen.getByLabelText('Barter'));
    await user.click(screen.getByRole('button', { name: 'Lanjut ke detail' }));
    expect(screen.getByRole('alert')).toHaveTextContent('PO dan catering hanya dapat memakai jenis Jual');
    expect(screen.getByLabelText('Barter')).toBeChecked();
  });

  it('keeps preview editing honest and disables persistence', async () => {
    show(null);
    expect(await screen.findByText(/Form contoh — perubahan tidak disimpan/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Simpan draft tidak aktif' })).toBeDisabled();
  });

  it('loads an existing owner listing and saves with its optimistic version', async () => {
    const user = userEvent.setup(); const api = gateway();
    vi.mocked(api.getMine).mockResolvedValue({
      sourceLifecycle: 'active', listingId: '20000000-0000-4000-8000-000000000002', expectedVersion: 7, publisher: { kind: 'personal' },
      modes: ['sale'], fulfillment: 'ready_stock', categoryId: 'home', title: 'Meja kayu', description: 'Masih kokoh untuk dipakai.',
      condition: 'good', defects: 'Ada gores tipis.', negotiable: true, barter: null, basePriceRupiah: '120000', variants: [], assetIds: ['30000000-0000-4000-8000-000000000003'], handoverMethods: ['meetup'], preorder: null, catering: null,
    });
    show(api, '/my/listings/20000000-0000-4000-8000-000000000002/edit');

    expect(await screen.findByDisplayValue('Meja kayu')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(api.publish).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 7, title: 'Meja kayu' }));
  });

  it('lets the owner choose the primary photo and remove an uploaded photo', async () => {
    const user = userEvent.setup(); const api = gateway();
    vi.mocked(api.getMine).mockResolvedValue({
      sourceLifecycle: 'active', listingId: '20000000-0000-4000-8000-000000000002', expectedVersion: 7, publisher: { kind: 'personal' },
      modes: ['sale'], fulfillment: 'ready_stock', categoryId: 'home', title: 'Meja kayu', description: 'Masih kokoh untuk dipakai.',
      condition: 'good', defects: 'Tidak ada kekurangan.', negotiable: false, barter: null, basePriceRupiah: '120000', variants: [],
      assetIds: ['30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000004'], handoverMethods: ['meetup'], preorder: null, catering: null,
    });
    show(api, '/my/listings/20000000-0000-4000-8000-000000000002/edit');

    expect(await screen.findByRole('button', { name: 'Jadikan foto utama 2' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Jadikan foto utama 2' }));
    expect(screen.getByText('Foto 1 — utama')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Hapus foto 2' }));
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(api.publish).toHaveBeenCalledWith(expect.objectContaining({ assetIds: ['40000000-0000-4000-8000-000000000004'] }));
  });

  it('keeps a failed upload retryable without losing the selected file', async () => {
    const user = userEvent.setup(); const api = gateway();
    vi.mocked(api.getMine).mockResolvedValue({
      sourceLifecycle: 'active', listingId: '20000000-0000-4000-8000-000000000002', expectedVersion: 7, publisher: { kind: 'personal' },
      modes: ['sale'], fulfillment: 'ready_stock', categoryId: 'home', title: 'Meja kayu', description: 'Masih kokoh untuk dipakai.',
      condition: 'good', defects: 'Tidak ada kekurangan.', negotiable: false, barter: null, basePriceRupiah: '120000', variants: [], assetIds: [],
      handoverMethods: ['meetup'], preorder: null, catering: null,
    });
    vi.mocked(api.uploadImage).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('40000000-0000-4000-8000-000000000004');
    show(api, '/my/listings/20000000-0000-4000-8000-000000000002/edit');

    await screen.findByDisplayValue('Meja kayu');
    await user.upload(screen.getByLabelText(/Foto aktual/), new File(['image'], 'meja.png', { type: 'image/png' }));
    expect(await screen.findByRole('button', { name: 'Ulangi unggah foto' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ulangi unggah foto' }));
    expect(await screen.findByText('Foto 1 — utama')).toBeVisible();
    expect(api.uploadImage).toHaveBeenCalledTimes(2);
  });

  it('offers real service-area choices for catering terms', async () => {
    const user = userEvent.setup(); show(gateway()); await screen.findByRole('heading', { name: 'Pasang penawaran' });
    await user.selectOptions(screen.getByLabelText('Kategori'), 'food');
    await user.selectOptions(screen.getByLabelText('Bentuk pemenuhan'), 'catering');
    await user.click(screen.getByRole('button', { name: 'Lanjut ke detail' }));
    await user.type(screen.getByLabelText('Nama penawaran'), 'Nasi kotak');
    await user.type(screen.getByLabelText('Detail'), 'Masakan rumahan untuk acara tetangga.');
    await user.type(screen.getByLabelText('Harga utama (rupiah)'), '25000');
    await user.upload(screen.getByLabelText(/Foto aktual/), new File(['image'], 'nasi.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Lanjut ke ketersediaan' }));
    await user.click(screen.getByRole('button', { name: 'Isi ketentuan catering' }));
    expect(await screen.findByRole('checkbox', { name: 'Depok' })).toBeVisible();
  });

  it('preselects the owner store from the catalogue entry link', async () => {
    const user = userEvent.setup(); const api = gateway();
    show(api, '/listings/new?storeId=70000000-0000-4000-8000-000000000007', storeGateway());
    expect(await screen.findByRole('radio', { name: 'Dapur Rina' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Simpan draft' }));
    expect(api.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ publisher: { kind: 'store', storeId: '70000000-0000-4000-8000-000000000007' } }));
  });
});
