# Barter

Marketplace lingkungan untuk jual beli, barter, pemberian gratis, dan pemasaran usaha UMKM di Jabodetabek.

## Status

Tahap perencanaan produk dan arsitektur. Repository ini belum berisi implementasi aplikasi.

Target awal adalah demo terintegrasi selama 9 hari × 3 jam, bukan peluncuran transaksi nyata. Pembayaran langganan Plus masih berupa simulasi.

## Dokumentasi

- [PRD v1.3](docs/PRD.md): kebutuhan produk dan keputusan brainstorming.
- [RFC-001](docs/RFC-001-arsitektur-barter.md): rancangan arsitektur, database, API, otorisasi, dan pengujian.

Keduanya masih berupa draft. Keputusan yang belum final ditandai di dalam dokumen.

## Teknologi

- React dan Vercel.
- Supabase untuk autentikasi dan backend.
- [rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA) untuk pengiriman OTP WhatsApp.
- RFC mengusulkan TypeScript dan Vite serta merinci komponen tambahan.

## Kontribusi

Baca PRD dan RFC sebelum mengubah alur produk. Gunakan branch fitur dan pull request untuk perubahan, serta catat keputusan baru pada dokumentasi terkait.

Jangan menyimpan credential, file environment berisi secret, sesi WhatsApp, atau data pribadi pengguna di repository. Instruksi menjalankan aplikasi akan ditambahkan saat implementasi tersedia.
