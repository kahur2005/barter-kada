# Rencana: edit profil toko

Status: selesai di branch `feat/barter-webapp`; belum dipush.

## Tujuan

Menghubungkan kontrak RFC `update_store` dengan halaman Toko saya agar pemilik Plus dapat memperbarui profil usaha dan kontrol alamat publik setelah toko dibuat.

## Keputusan implementasi

- Slug publik tetap menjadi identitas URL dan tidak diubah dari form edit.
- Server memeriksa sesi aktif, entitlement Plus, pemilik toko, wilayah layanan, dan constraint profil.
- Alamat hanya disimpan/diproyeksikan ketika pemilik mencentang persetujuan tampil publik.
- Tidak menambahkan penghapusan, transfer kepemilikan, atau akses staf karena keputusan produk itu masih terbuka.

## Langkah

1. Tambahkan test gateway dan halaman yang gagal untuk `update_store`.
2. Tambahkan tipe/store gateway dan form edit mobile dengan nilai awal dari server.
3. Tambahkan migration RPC, DTO owner, privilege, dan assertion pgTAP.
4. Jalankan unit test, build, E2E, audit, review diff, lalu commit lokal.
