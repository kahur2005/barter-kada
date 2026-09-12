# Barter Negotiation and Settlement Implementation Plan

**Goal:** Menjalankan alur barter dua pihak dari penyusunan paket, revisi, dua `Siap`, dua `Setujui`, reservasi atomik, pemeriksaan saat bertemu, tambahan uang manual, sampai selesai atau dibatalkan.

## Product invariants

- Satu transaksi selalu berada dalam conversation dua peserta dan bermula dari listing aktif yang mendukung barter. Transaksi dengan diri sendiri ditolak.
- Setiap revisi adalah snapshot immutable. Revisi actor mengganti seluruh paket miliknya, menyalin paket pihak lain, dan membuat revision baru tanpa readiness/approval aktif.
- Tiap pihak harus menawarkan minimal satu barang lengkap sebelum `Siap`; persetujuan berlaku pada keseluruhan paket dan expected revision yang sama.
- `Setujui` hanya tersedia sesudah dua pihak siap. Persetujuan terakhir mengunci semua listing tertaut dalam urutan global dan membuat seluruh reservasi atau tidak membuat apa pun.
- Beberapa negosiasi atas listing yang sama boleh berlangsung; hanya satu yang dapat menjadi `agreed`. Barang langsung tidak dianggap sama lintas transaksi.
- Top-up hanya satu arah, rupiah positif, tanpa DP, dibayar saat pertemuan. Hanya penerima yang dapat mengakui uang diterima.
- Kedua pihak mengonfirmasi barang diterima setelah pemeriksaan. Completion memerlukan dua penerimaan dan acknowledgement top-up bila ada.
- Pembatalan memerlukan alasan. Setelah satu penerimaan tercatat, pembatalan biasa ditolak dengan `DISPUTE_REQUIRED` dan reservasi tetap ditahan.
- Revisi setelah `agreed` ditunda sesuai opsi demo RFC D-03; UI mengarahkan ke pembatalan/laporan dan tidak melepaskan reservasi lewat edit sepihak.
- Realtime hanya memicu refetch. Semua command sensitif membawa expected revision dan idempotency key; server menjadi sumber status final.

## Vertical implementation sequence

1. Definisikan DTO dan `TradeGateway`: create/load/revise/ready/approve/receive/acknowledge top-up/cancel/subscribe. Tambahkan parsing gagal-aman dan unit tests.
2. Buat route `/barter/new/:listingId` dan `/transactions/:id` dengan gate akun. Form awal memilih listing milik sendiri atau barang langsung, foto conversation-scoped, serta optional top-up.
3. Buat ruang barter mobile: paket actor selalu pertama, paket counterpart kedua, version/status, riwayat ringkas, top-up eksplisit, serta CTA state-aware tanpa optimistic approval.
4. Tambahkan migration transaksi, revisi/items/consents/events, inventory pool/reservation, fulfillment, obligation/acknowledgement, receipt idempoten, RLS dan grants.
5. Implementasikan command atomik. Revisi mereset consent melalui revision baru; final approval mengunci listing/pool terurut dan rollback penuh jika satu barang unavailable.
6. Ikat media barang langsung ke revision melalui aset conversation privat; perluas storage read policy hanya untuk participant transaksi yang sah. Listing item memakai snapshot path listing-media canonical.
7. Tambahkan system transaction message ke chat setelah create/revise/agreed/received/top-up/cancel/completed tanpa menggunakan payload Realtime sebagai source of truth.
8. Tambahkan pgTAP untuk T-02/T-04/T-14/T-15/T-29 dan test otorisasi. Concurrency T-03 dijalankan saat PostgreSQL runtime tersedia.
9. Verifikasi unit/component, build, preview E2E responsif dan audit. Migration/RLS/concurrency tidak dinyatakan lulus sampai Supabase lokal/cloud demo benar-benar menjalankannya.

## UI states

- Paket belum lengkap: jelaskan item/foto yang kurang; `Siap` disabled.
- Actor belum siap: `Siap untuk versi N`.
- Actor siap, counterpart belum: `Menunggu pihak lain siap`.
- Dua siap, actor belum approve: dialog review lengkap lalu `Setujui barter`.
- Actor approve, counterpart belum: `Menunggu persetujuan pihak lain`.
- Agreed: instruksi inspeksi, `Barang sudah diterima`, top-up payee-only, chat untuk lokasi, pembatalan beralasan sebelum receipt pertama.
- Completed/cancelled: read-only receipt; tidak ada CTA status palsu.
