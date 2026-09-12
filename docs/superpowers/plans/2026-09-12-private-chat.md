# Private Chat Implementation Plan

**Goal:** Membuat percakapan privat yang persisten dan realtime sebagai konteks negosiasi jual, gratis, PO, catering, dan barter.

## Invariants

- Tepat satu conversation untuk kombinasi listing + pasangan dua user terurut; pemilik tidak dapat chat diri sendiri.
- Membuka conversation baru memerlukan akun aktif/onboarding lengkap, listing aktif, dan tidak ada blokir dua arah.
- Pesan append-only; tidak ada edit/unsend. Teks 1–2.000 karakter. `clientMessageId` UUID memberi retry idempotent.
- `seq` dibuat server sambil mengunci conversation. Read cursor hanya actor, monoton, dan tidak dapat melebihi sequence terakhir.
- Inbox/unread hanya untuk participant. Realtime hanya akselerator setelah commit; reconnect selalu fetch berdasarkan sequence.
- Pesan umum `transactionId=null`; kartu transaksi sistem akan memakai transaction ID saat subsystem transaksi tersedia.
- D-08: blokir menghentikan conversation/negosiasi baru. Pengecualian kanal transaksi aktif ditambahkan bersama tabel transaksi, bukan dibuka tanpa konteks.
- Lampiran chat maksimal 4 gambar per pesan, masing-masing 5 MB, bucket privat, re-encode WebP tanpa EXIF, signed URL 60 detik. Tahap teks/realtime dibangun dulu; media memakai pipeline terpisah sebelum tahap chat dinyatakan selesai.

## TDD sequence

1. Definisikan DTO/chat gateway dan test parsing + idempotent send/read command.
2. Buat inbox dan room mobile: listing context, unread, riwayat incremental, composer, status terkirim/dibaca, block/report menu yang jujur.
3. Hubungkan CTA listing ke `open_conversation`, mempertahankan return path dan auth/onboarding gate.
4. Buat migration conversation/member/message/block, command RPC, RLS, grants, sequence lock, dan publication Realtime.
5. Tambahkan subscription Supabase yang invalidates/fetches pesan; jangan memakai payload Realtime sebagai source of truth.
6. Tambahkan media chat privat dan kartu listing/system; integrasikan transaction cards saat negotiation/order subsystem dibuat.
7. Verifikasi unit, pgTAP/RLS/race bila runtime tersedia, E2E dua akun, mobile/a11y, build, dan audit.
