# Rencana: kontrol foto pada editor listing

Status: selesai di branch `feat/barter-webapp`; perubahan belum dipush.

## Tujuan

Memenuhi PDR UI-04 agar pemilik listing dapat mengelola hasil upload foto, bukan hanya memilih file baru.

## Keputusan implementasi

- `assetIds` tetap menjadi sumber urutan foto yang dikirim ke gateway.
- Asset pertama adalah foto utama karena RPC katalog menyimpan posisi berdasarkan urutan array.
- Penghapusan dan pemilihan foto utama hanya mengubah draft lokal sampai pemilik menyimpan atau menerbitkan perubahan.
- Upload diproses berurutan. Jika sebagian gagal, file yang belum berhasil tetap disimpan untuk tombol retry.
- UI tidak menebak URL asset; daftar mengelola ID yang sudah diproses dan tetap kompatibel dengan preview gateway.
- Navigasi keluar dari editor memakai dialog eksplisit agar draft/perubahan tidak hilang; pilihan simpan memakai gateway yang sama, sedangkan buang hanya mengakhiri state lokal.

## Langkah

1. [x] Tambahkan test gagal untuk foto utama dan penghapusan.
2. [x] Implementasikan reorder foto, hapus foto, dan retry upload.
3. [x] Tambahkan test untuk kegagalan lalu retry upload.
4. [x] Tambahkan guard navigasi untuk perubahan belum tersimpan.
5. [x] Jalankan full verification dan siapkan commit lokal.

## Hasil sementara

- Test fokus `ListingEditorPage.test.tsx`: 11 tes lulus.
- Full unit: 47 file / 157 tes lulus.
- Production build lulus; warning chunk >500 kB tetap dicatat sebagai optimasi lanjutan.
- E2E: 26 lulus dan 1 skenario desktop-only dilewati.
- Audit dependency produksi: 0 vulnerability.
- Runtime upload/storage Supabase belum diverifikasi karena Docker Desktop Linux Engine/API belum tersedia.
