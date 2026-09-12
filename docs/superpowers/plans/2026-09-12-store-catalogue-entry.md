# Rencana: pintu masuk katalog toko

Status: selesai di branch `feat/barter-webapp`; belum dipush.

## Tujuan

Membuat pemilik toko dapat langsung menambahkan produk ke katalog dari halaman Toko saya, tanpa memilih toko secara manual setelah berpindah ke wizard listing.

## Keputusan implementasi

- Produk katalog tetap merupakan listing yang sama dengan listing pribadi; `store_id` menjadi identitas penerbit dan snapshot transaksi tidak berubah.
- URL memakai `storeId` hanya sebagai preselection UX. Server tetap menjadi sumber kebenaran melalui `get_my_stores()` dan RPC listing owner-scoped.
- Jika toko tidak ditemukan di data owner, wizard tidak memilih penerbit toko secara otomatis.
- Tidak membuat halaman editor katalog terpisah atau mengubah kontrak database listing.

## Langkah

1. Tambahkan test CTA toko dan test wizard yang memvalidasi preselection toko dari owner data.
2. Tambahkan link `Tambah produk` serta pembacaan `storeId` pada wizard.
3. Jalankan unit test, build, E2E, audit, dan diff check.
4. Dokumentasikan lalu commit lokal tanpa push.
