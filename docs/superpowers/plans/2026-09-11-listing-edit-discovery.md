# Listing Edit and Discovery Completion Plan

**Goal:** Menutup vertical slice katalog personal: listing existing dapat dimuat/diedit, catering memilih area layanan, dan feed/detail production memakai data Supabase yang hanya mengekspos lokasi tersamarkan serta media yang sudah diproses.

## Contract decisions

- `get_my_listing(uuid)` hanya untuk owner dan mengembalikan bentuk `ListingDraft` plus version saat ini.
- Route edit adalah `/my/listings/:id/edit`; server tetap menjadi sumber otorisasi dan optimistic version.
- RPC discovery hanya membaca listing `active` yang tidak disembunyikan. Jarak memakai titik user authenticated bila tersedia; fallback memakai centroid area pilihan. Tidak ada koordinat seller pada DTO.
- Storage `listing-media` dibuat public setelah EXIF dibuang dan nama objek berupa UUID acak. RPC mengirim storage path; adapter frontend membentuk public URL dari konfigurasi Supabase sebelum validasi DTO.
- Pagination MVP memakai cursor `(created_at, listing_id)` terenkode base64 dan terikat pada sort/filter melalui hash payload. Implementasi pertama membatasi 24 item.
- Search toko tetap kosong sampai domain Plus/toko dibangun; endpoint tidak mengarang fixture.

## TDD sequence

1. Tambah test gateway untuk load listing dan normalisasi path media discovery.
2. Tambah test editor untuk memuat listing existing serta mempertahankan version saat save.
3. Implement route edit, gateway method, loading/error UI, dan pilihan area catering.
4. Buat migration RPC owner detail, search/detail listing publik, serta endpoint store kosong yang sesuai kontrak.
5. Tambah pgTAP untuk ownership, hidden/draft exclusion, field privacy, filter utama, dan detail.
6. Jalankan unit/typecheck/build/E2E/audit, inspeksi mobile, dan catat batas runtime Supabase yang belum dapat dijalankan.
