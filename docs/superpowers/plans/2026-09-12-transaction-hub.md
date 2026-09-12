# Transaction Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task.

**Goal:** Memenuhi PDR UI-08 untuk halaman “Transaksi saya” dengan pemisahan Perlu tindakan/Berjalan/Selesai, peran pengguna yang eksplisit, dan identitas penerbit listing yang tidak tercampur dengan jenis transaksi.

**Architecture:** RPC `list_my_transactions` tetap menjadi sumber kebenaran dan mengembalikan projection yang sudah diberi `bucket`, `role`, serta `publisher`. Server menentukan `actionRequired` dari lifecycle dan state yang memang tersedia, lalu frontend hanya memetakan projection ke tampilan mobile. Untuk histori transaksi yang mungkin tidak lagi terlihat oleh RLS listing publik, RPC memakai `security definer` dengan `search_path = ''` dan predicate participant eksplisit.

**Tech Stack:** React, TypeScript, TanStack Query, Zod, Vitest/Testing Library, Supabase PostgreSQL migration/RPC, Vite.

**Spec:** `docs/PDR-001-desain-produk.md` §12 (UI-08), `docs/RFC-001-arsitektur-barter.md` bagian projection penerbit dan akses transaksi, `docs/IMPLEMENTATION.md` status UI-08.

## Global Constraints

- Jangan menganggap akun hanya pembeli atau hanya penjual; role order adalah buyer/seller dan role barter adalah party_a/party_b.
- Jangan menganggap toko sebagai jenis transaksi; publisher tetap personal atau store dan dibawa sebagai konteks terpisah.
- Data transaksi hanya boleh kembali untuk `auth.uid()` yang menjadi participant.
- RPC memakai `set search_path = ''`, nama objek fully-qualified, `revoke all` lalu grant `execute` hanya ke `authenticated`.
- Ikuti TDD: tulis/ubah test sebelum implementasi produksi dan jalankan focused verification setelah tiap task.
- Buat migration dengan Supabase CLI, bukan menebak nama file; runtime database mungkin tetap belum tersedia karena Docker lokal sebelumnya tidak sehat.

## Task 1: Lock the transaction projection contract

1. Periksa kontrak TypeScript, gateway, dan fixture transaksi yang ada.
2. Tambahkan failing tests yang mensyaratkan field `bucket`, `actorRole`, `publisherKind`, `publisherName`, dan `actionRequired` pada summary.
3. Perbarui Zod schema dan tipe gateway agar data malformed ditolak dengan error yang sama seperti kontrak sebelumnya.
4. Jalankan test transaksi dan pastikan test baru gagal sebelum migration/frontend selesai.

## Task 2: Extend the participant-scoped Supabase projection

1. Jalankan discovery `supabase migration new --help`, lalu buat migration baru dengan `supabase migration new transaction_hub`.
2. Ganti function `public.list_my_transactions(text)` melalui migration baru untuk mengembalikan role, publisher personal/store, action state, dan bucket.
3. Untuk barter, ambil publisher dari listing target pada revision aktif; fallback ke profil party A bila item tidak lagi punya listing.
4. Untuk order, ambil publisher dari `orders.listing_id` dan `listings.store_id`, sehingga nama toko tetap terpisah dari role buyer/seller.
5. Derive bucket server-side: completed/cancelled → selesai; actionRequired → perlu tindakan; sisanya → berjalan.
6. Tambahkan static migration assertions untuk security mode, participant predicate, `search_path`, revoke, dan authenticated grant.
7. Jalankan static SQL checks dan `supabase test db`; jika Docker kembali unavailable, catat blocker tanpa mengklaim runtime pass.

## Task 3: Build the mobile transaction hub UI

1. Tambahkan failing component tests untuk tiga heading section, role/publisher copy, empty state per section, dan tetap adanya filter Semua/Barter/Pesanan.
2. Implementasikan label role/publisher dan pengelompokan stabil berdasarkan `bucket`, tanpa mengubah lifecycle label yang sudah dilokalkan.
3. Pastikan setiap baris tetap punya link deep-link, counterpart, status, waktu eksplisit, dan target tap yang mudah digunakan mobile.
4. Tambahkan style minimal untuk section heading dan publisher metadata tanpa mengubah design system yang sudah ada.

## Task 4: Document and verify

1. Tambahkan bukti implementasi UI-08 ke `docs/IMPLEMENTATION.md`, termasuk batas verifikasi database.
2. Jalankan focused unit tests, seluruh unit tests, production build, E2E, audit production dependency, dan `git diff --check`.
3. Review diff untuk memastikan tidak ada credential, payment gateway, atau data lokasi presisi yang masuk ke projection.
4. Commit perubahan dengan pesan Conventional Commit yang menjelaskan transaction hub.
