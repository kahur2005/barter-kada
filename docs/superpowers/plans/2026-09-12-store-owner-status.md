# Rencana: status operasional Toko saya

Status: selesai di branch `feat/barter-webapp`; belum dipush.

## Tujuan

Membuat halaman Toko saya memberi gambaran operasional yang sesuai PDR: jumlah produk aktif per toko dan konsekuensi Plus yang sudah berakhir.

## Keputusan implementasi

- Counter produk aktif dihitung server-side dari listing `active` yang memiliki `store_id`; client tidak menghitung atau menerima angka dari state lokal.
- Data toko dan transaksi tetap dapat diakses pemilik ketika Plus tidak aktif, tetapi banner mengarahkan ke perpanjangan Plus dan daftar transaksi.
- Banner tidak ditampilkan ketika status Plus belum diketahui agar tidak menyimpulkan entitlement dari kegagalan jaringan.
- Publik tetap mengikuti `store_public_visible`; perubahan ini tidak membuka katalog tersembunyi.

## Langkah

1. Tambahkan test UI owner projection/counter/banner yang gagal.
2. Tambahkan DTO owner `activeProductCount`, migration projection, dan query status Plus.
3. Jalankan unit test, build, E2E, audit, lalu commit lokal.
