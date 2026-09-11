# Barter

Marketplace lingkungan untuk jual beli, barter, pemberian gratis, dan pemasaran usaha UMKM di Jabodetabek.

## Status

Implementasi sedang berjalan pada fondasi React mobile-first. Discovery barang, detail listing, daftar toko, dan katalog toko sudah tersedia dalam mode preview read-only. Auth, chat, transaksi, barter, OTP, moderasi, dan langganan Plus belum terhubung; halaman fitur tersebut menampilkan status yang jujur dan tidak membuat data transaksi palsu.

Target awal tetap demo terintegrasi selama 9 hari × 3 jam, bukan peluncuran transaksi nyata. Pembayaran langganan Plus masih berupa simulasi.

## Menjalankan aplikasi

Prasyarat: Node.js 24 dan npm 11 (versi minimum Node yang didukung proyek tercantum di `package.json`).

```powershell
npm.cmd install
npm.cmd run dev:preview
```

Mode preview memakai data sintetis lokal dan selalu menampilkan label bahwa data tidak dapat ditransaksikan. Build preview dapat diperiksa dengan `npm.cmd run build:preview`.

Runtime normal tidak melakukan fallback ke data contoh. Salin `.env.example` menjadi `.env.local`, lalu isi dua konfigurasi publik dari proyek Supabase khusus Barter:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Jangan memasukkan service role key, secret key, kredensial OpenWA, atau data pengguna ke variabel `VITE_*`. Tanpa konfigurasi publik yang valid, aplikasi menampilkan petunjuk setup dan tidak berpura-pura tersambung.

Perintah pemeriksaan:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
npm.cmd audit --omit=dev
```

Tes browser memakai Microsoft Edge melalui Playwright secara default. Untuk Chromium hasil instalasi Playwright, kosongkan/ubah `PLAYWRIGHT_CHANNEL` sesuai lingkungan.

## Dokumentasi

- [PRD v1.3](docs/PRD.md): kebutuhan produk dan keputusan brainstorming.
- [RFC-001](docs/RFC-001-arsitektur-barter.md): rancangan arsitektur, database, API, otorisasi, dan pengujian.
- [Matriks cakupan RFC-001](docs/RFC-001-matriks-cakupan.md): pemetaan butir PRD ke rancangan, data/API, tes, dan prioritas demo.
- [PDR-001 — Desain produk](docs/PDR-001-desain-produk.md): usulan desain mobile-first terinspirasi Craigslist, fondasi visual, wireframe, spesifikasi layar, dan kriteria penerimaan UI.
- [Kontrak discovery](docs/contracts/discovery-api.md): payload publik dan RPC provisional yang harus diimplementasikan backend Supabase.
- [Status implementasi](docs/IMPLEMENTATION.md): urutan subsystem, bukti, dan pekerjaan yang masih terbuka.

Dokumen masih berupa draft. Keputusan yang belum final ditandai di dalam dokumen. Pemetaan kebutuhan dan skenario tes belum berarti implementasi atau pengujiannya sudah selesai.

## Teknologi

- React, TypeScript, Vite, dan Vercel.
- Supabase untuk autentikasi dan backend.
- [rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA) untuk pengiriman OTP WhatsApp.
- React Router, TanStack Query, Zod, Vitest, Testing Library, dan Playwright pada fondasi aplikasi.

## Kontribusi

Baca PRD dan RFC sebelum mengubah alur produk. Gunakan branch fitur dan pull request untuk perubahan, serta catat keputusan baru pada dokumentasi terkait.

Jangan menyimpan credential, file environment berisi secret, sesi WhatsApp, atau data pribadi pengguna di repository.
