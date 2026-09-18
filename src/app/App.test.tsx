import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { App } from './App';
import './styles.css';
import '../features/discovery/discovery.css';
import type { DiscoveryRepository } from '../features/discovery/repository';
import { createPreviewRepository } from '../features/discovery/preview-repository';
import { demoStores } from '../features/discovery/fixtures';
import { listingSchema } from '../features/discovery/types';
import { listing } from '../test/fixtures';

const repo = createPreviewRepository([listingSchema.parse(listing), listingSchema.parse({ ...listing, id: '10000000-0000-4000-8000-000000000002', title: 'Nasi kotak', category: 'food', modes: ['sale'] })], demoStores);
function show(path = '/', repository: DiscoveryRepository = repo) { return render(<MemoryRouter initialEntries={[path]}><App repository={repository} /></MemoryRouter>); }
it('marks discovery loading as busy for assistive technology', async () => {
  const pendingRepository: DiscoveryRepository = {
    ...repo,
    searchListings: () => new Promise<never>(() => {}),
  };
  show('/', pendingRepository);
  expect(await screen.findByRole('status', { name: 'Memuat penawaran' })).toHaveAttribute('aria-busy', 'true');
});
it('searches real listing rows and keeps the search value on detail return', async () => {
  const user = userEvent.setup(); show();
  await screen.findByRole('link', { name: 'Kursi kayu bekas' });
  await user.type(screen.getByRole('searchbox'), 'kursi');
  await user.click(screen.getByRole('button', { name: 'Cari' }));
  expect(await screen.findByRole('link', { name: 'Kursi kayu bekas' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Nasi kotak' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Kursi kayu bekas' }));
  expect(await screen.findByRole('heading', { name: 'Kursi kayu bekas' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: /Kembali ke hasil/ }));
  expect(screen.getByRole('searchbox')).toHaveValue('kursi');
});
it('renders both barter and sale actions without fake consent', async () => {
  const user = userEvent.setup(); show(`/listings/${listing.id}`);
  expect(await screen.findByRole('link', { name: 'Chat penjual' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Ajukan barter' }));
  expect(await screen.findByRole('heading', { name: 'Pengajuan barter belum aktif' })).toBeVisible();
  expect(screen.queryByText('Disepakati')).not.toBeInTheDocument();
});
it('shows a useful empty state instead of silently expanding the radius', async () => {
  show('/search?q=tidakada');
  expect(await screen.findByRole('heading', { name: 'Belum ada penawaran yang cocok' })).toBeVisible();
  expect(screen.getByRole('button', { name: /Depok.*5 km/ })).toBeVisible();
});
it('shows an icon for every browse category', async () => {
  show('/search');
  await screen.findByRole('link', { name: 'Kursi kayu bekas' });
  for (const name of ['Makanan', 'Pakaian', 'Rumah & furnitur', 'Kendaraan', 'Kebun', 'Lainnya']) {
    expect(screen.getByRole('button', { name }).querySelector('svg')).not.toBeNull();
  }
});
it('retries a transport failure instead of rendering fake listings', async () => {
  let fail = true;
  const failingRepo = { ...repo, searchListings: async (...args: Parameters<typeof repo.searchListings>) => { if (fail) throw new Error('Tidak dapat memuat data.'); return repo.searchListings(...args); } };
  const user = userEvent.setup();
  render(<MemoryRouter><App repository={failingRepo} /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Tidak dapat memuat');
  fail = false;
  await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
  expect(await screen.findByRole('link', { name: 'Kursi kayu bekas' })).toBeVisible();
});
it('uses backend discovery areas instead of the preview area list', async () => {
  const user = userEvent.setup();
  const backendRepo: DiscoveryRepository = {
    ...repo,
    source: 'supabase',
    listAreas: vi.fn().mockResolvedValue([
      { areaId: 'depok', name: 'Depok' },
      { areaId: 'jakarta-selatan', name: 'Kota Adm. Jakarta Selatan' },
      { areaId: 'kota-bekasi', name: 'Kota Bekasi' },
    ]),
  };
  show('/', backendRepo);
  await screen.findByRole('link', { name: 'Kursi kayu bekas' });
  await user.click(screen.getByRole('button', { name: /Depok.*5 km/ }));
  expect(await screen.findByRole('option', { name: 'Kota Adm. Jakarta Selatan' })).toBeVisible();
  expect(screen.getByRole('option', { name: 'Kota Bekasi' })).toBeVisible();
});
it('explains when a bookmarked area is no longer active', async () => {
  const backendRepo: DiscoveryRepository = {
    ...repo,
    source: 'supabase',
    listAreas: vi.fn().mockResolvedValue([{ areaId: 'depok', name: 'Depok' }]),
  };
  show('/?area=kota-tangerang-selatan', backendRepo);
  expect(await screen.findByRole('heading', { name: 'Area pencarian tidak tersedia' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Pilih area' })).toBeVisible();
});

it('gives the first unfiltered offer visual priority and keeps exact location private', async () => {
  const home = show('/');
  const featured = await screen.findByRole('article', { name: 'Penawaran utama: Kursi kayu bekas' });
  expect(featured).toContainElement(screen.getByRole('link', { name: 'Kursi kayu bekas' }));
  home.unmount();

  show(`/listings/${listing.id}`);
  expect(await screen.findByRole('group', { name: 'Detail penawaran' })).toHaveTextContent('Lokasi tepatTetap privat');
});

it('limits featured treatment to the first unfiltered home listing', async () => {
  const home = show('/');
  await screen.findByRole('article', { name: 'Penawaran utama: Kursi kayu bekas' });
  expect(document.querySelectorAll('.listing-row--featured')).toHaveLength(1);
  home.unmount();

  for (const path of ['/search?q=kursi', '/search?category=home', '/stores']) {
    const view = show(path);
    if (path === '/stores') {
      await screen.findByText('Dapur Bu Rina');
    } else {
      await screen.findByRole('link', { name: 'Kursi kayu bekas' });
    }
    expect(document.querySelectorAll('.listing-row--featured')).toHaveLength(0);
    view.unmount();
  }
});

it('keeps the Barter shell consistent while focused tasks remove competing navigation', () => {
  const focused = show('/auth/login');
  expect(screen.getByRole('link', { name: 'Barter beranda' })).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Buka bantuan pelanggan' })).not.toBeInTheDocument();
  focused.unmount();

  show('/search');
  expect(screen.getAllByRole('link', { name: 'Jelajah' })).not.toHaveLength(0);
  expect(screen.getAllByRole('link', { name: 'Chat' })).not.toHaveLength(0);
  expect(screen.getByRole('link', { name: /Notifikasi/ })).toBeVisible();
  expect(screen.getAllByRole('navigation', { name: 'Navigasi utama' })).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Buka bantuan pelanggan' })).toBeVisible();
});

it('uses contrast-safe action colors on standard search controls', async () => {
  show('/search');
  await screen.findByRole('link', { name: 'Kursi kayu bekas' });

  expect(getComputedStyle(screen.getByRole('button', { name: 'Cari' })).color).toBe('rgb(17, 19, 24)');
  expect(getComputedStyle(screen.getByRole('button', { name: 'Reset', hidden: true })).backgroundColor).toBe('rgb(26, 29, 35)');
  expect(getComputedStyle(screen.getByRole('button', { name: 'Buka bantuan pelanggan' })).color).toBe('rgb(17, 19, 24)');
});

it('uses dark ink for lime category and support message states', async () => {
  const user = userEvent.setup();
  show('/search');
  await screen.findByRole('link', { name: 'Kursi kayu bekas' });
  const category = screen.getByRole('button', { name: 'Makanan' });

  await user.click(category);
  const selectedCategory = await screen.findByRole('button', { name: 'Makanan' });
  expect(selectedCategory).toHaveClass('selected');
  expect(getComputedStyle(selectedCategory).color).toBe('rgb(17, 19, 24)');

  await user.click(screen.getByRole('button', { name: 'Buka bantuan pelanggan' }));
  await user.type(screen.getByRole('textbox', { name: 'Pesan ke bantuan pelanggan' }), 'Saya perlu bantuan');
  await user.click(screen.getByRole('button', { name: 'Kirim pertanyaan' }));
  expect(getComputedStyle(await screen.findByText('Saya perlu bantuan')).color).toBe('rgb(17, 19, 24)');
});
