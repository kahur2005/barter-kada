import { listingSchema, storeSchema, type PublicListing } from './types';

// Fictional catalogue at a fixed demonstration date, not live inventory or reputation.
const person = { id: '20000000-0000-4000-8000-000000000001', name: 'Dita', storeSlug: null, phoneVerified: false, rating: null, reviewCount: 0 };
export const demoStores = [storeSchema.parse({
  id: '30000000-0000-4000-8000-000000000001', slug: 'dapur-bu-rina', name: 'Dapur Bu Rina', category: 'food',
  description: 'Masakan rumahan untuk bekal, acara keluarga, dan makan siang bersama.',
  area: { id: 'depok', name: 'Beji, Depok', distanceKm: 3 }, hours: 'Senin–Sabtu, 08.00–17.00 WIB',
  handoverMethods: ['pickup', 'delivery'], publicAddress: null, publicAddressConsent: false, image: null, rating: null, reviewCount: 0,
}), storeSchema.parse({
  id: '30000000-0000-4000-8000-000000000002', slug: 'lemari-kedua', name: 'Lemari Kedua', category: 'clothing',
  description: 'Pakaian preloved terawat. Beri kesempatan kedua untuk dipakai lagi.',
  area: { id: 'depok', name: 'Kukusan, Depok', distanceKm: 2 }, hours: 'Setiap hari, 09.00–18.00 WIB',
  handoverMethods: ['meetup', 'pickup'], publicAddress: null, publicAddressConsent: false, image: null, rating: null, reviewCount: 0,
})];
const base: PublicListing = listingSchema.parse({
  id: '10000000-0000-4000-8000-000000000001', title: 'Kursi kayu bekas', description: 'Kursi kayu untuk meja belajar. Masih kokoh dan nyaman dipakai. Dijual karena menata ulang ruang kerja.',
  modes: ['sale', 'barter'], fulfillment: 'ready_stock', category: 'home', condition: 'Bekas, layak pakai', defects: 'Ada goresan kecil pada sandaran.',
  priceMin: '150000', priceMax: '150000', unit: 'buah', negotiable: true, barterPreferences: 'Rak buku kecil. Terbuka untuk tawaran barang lain.',
  area: { id: 'depok', name: 'Beji, Depok', distanceKm: 2 }, publisher: person, images: [{ url: '/assets/chair.svg', alt: 'Ilustrasi kursi kayu, bukan foto barang nyata' }],
  variants: [], preorder: null, catering: null, handoverMethods: ['pickup', 'meetup'], availability: 'available', promoted: false, createdAt: '2026-09-11T08:00:00Z',
});
function item(number: number, changes: Partial<PublicListing>) { return listingSchema.parse({ ...base, id: `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`, createdAt: `2026-09-11T${String(9 - number).padStart(2, '0')}:00:00Z`, ...changes }); }
const foodPublisher = { ...person, id: demoStores[0].id, name: 'Dapur Bu Rina', storeSlug: 'dapur-bu-rina' };
export const demoListings = [base,
  item(2, { title: 'Nasi kotak untuk Jumat bersama', description: 'Nasi hangat, lauk pilihan, sayur dan sambal terpisah. Pesan beberapa varian untuk acara keluarga atau makan siang kantor.', category: 'food', modes: ['sale'], fulfillment: 'preorder', priceMin: '10000', priceMax: '15000', unit: 'pcs', negotiable: false, barterPreferences: null, condition: 'Dibuat sesuai pesanan', defects: 'Informasikan alergi makanan melalui chat sebelum menyepakati pesanan.', publisher: foodPublisher, images: [{ url: '/assets/food.svg', alt: 'Ilustrasi nasi kotak, data contoh' }], variants: [{ id: 'ayam', name: 'Nasi ayam', price: '15000', unit: 'pcs' }, { id: 'telur', name: 'Nasi telur', price: '10000', unit: 'pcs' }], preorder: { closesAt: '2026-09-12T11:00:00Z', availableAt: '2026-09-13T04:00:00Z', minimumQty: 10, remainingQty: 40, dpPercent: 50 }, handoverMethods: ['pickup', 'delivery'] }),
  item(3, { title: 'Jaket denim ukuran M', category: 'clothing', priceMin: null, priceMax: null, modes: ['barter'], negotiable: false, description: 'Jaket denim yang masih nyaman dipakai. Ingin ditukar dengan tas atau buku.', defects: 'Sedikit pudar di bagian lengan.', barterPreferences: 'Tas kanvas atau buku fiksi, boleh tawarkan yang lain.', images: [{ url: '/assets/jacket.svg', alt: 'Ilustrasi jaket denim, data contoh' }] }),
  item(4, { title: 'Bibit cabai dari kebun rumah', category: 'garden', priceMin: '0', priceMax: '0', modes: ['free'], negotiable: false, description: 'Ada beberapa bibit cabai siap dipindah ke pot. Silakan hubungi untuk menyepakati jumlah dan pengambilan.', condition: 'Bibit hidup', defects: 'Ukuran bibit tidak semuanya sama.', barterPreferences: null, area: { id: 'depok', name: 'Kukusan, Depok', distanceKm: 1 }, images: [{ url: '/assets/plant.svg', alt: 'Ilustrasi bibit tanaman, data contoh' }] }),
  item(5, { title: 'Kemeja linen warna natural', category: 'clothing', priceMin: '75000', priceMax: '75000', modes: ['sale'], publisher: { ...person, id: demoStores[1].id, name: 'Lemari Kedua', storeSlug: 'lemari-kedua' }, description: 'Kemeja linen ukuran L. Sudah dicuci dan siap digunakan kembali.', defects: 'Warna sedikit memudar setelah dicuci.', barterPreferences: null, images: [{ url: '/assets/jacket.svg', alt: 'Ilustrasi pakaian, data contoh' }] }),
  item(6, { title: 'Sepeda kota untuk perjalanan dekat', category: 'vehicles', priceMin: '850000', priceMax: '850000', modes: ['sale', 'barter'], description: 'Sepeda untuk perjalanan santai di sekitar rumah. Rem berfungsi, silakan periksa langsung saat bertemu.', defects: 'Ban belakang mulai aus.', barterPreferences: 'Sepeda lipat, tambahan uang bisa dibahas.', images: [{ url: '/assets/bicycle.svg', alt: 'Ilustrasi sepeda, data contoh' }], area: { id: 'depok', name: 'Pancoran Mas, Depok', distanceKm: 4 } }),
  item(7, { title: 'Catering rumahan untuk acara kecil', category: 'food', fulfillment: 'catering', modes: ['sale'], priceMin: '25000', priceMax: '25000', unit: 'paket', publisher: foodPublisher, condition: 'Dibuat sesuai pesanan', defects: 'Konfirmasi alergi dan kebutuhan khusus terlebih dahulu.', barterPreferences: null, description: 'Menu rumahan dengan pilihan lauk dan sayur. Cocok untuk arisan atau acara keluarga. Jadwal dan kapasitas dikonfirmasi melalui chat.', images: [{ url: '/assets/food.svg', alt: 'Ilustrasi menu catering, data contoh' }], catering: { minimumQty: 15, leadTimeHours: 48, serviceAreas: ['Depok', 'Jakarta Selatan'], notes: 'Menu dan tanggal dapat dibahas sebelum penjual membuat ringkasan pesanan.' } }),
];
