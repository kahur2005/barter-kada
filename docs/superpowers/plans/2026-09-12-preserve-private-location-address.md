# Rencana: pertahankan alamat lokasi privat saat edit akun

Status: selesai di branch `feat/barter-webapp`; belum dipush.

## Tujuan

Memenuhi alur PDR UI-03 agar pemilik akun dapat meninjau alamat/patokan privat yang tersimpan dan tidak menghapusnya secara tidak sengaja ketika memperbarui lokasi.

## Keputusan implementasi

- RPC onboarding owner mengembalikan `address` hanya melalui projection yang dipanggil oleh actor saat ini.
- Form lokasi memakai nilai tersebut sebagai `defaultValue`; pengguna tetap dapat mengosongkannya secara eksplisit.
- Alamat tidak ditambahkan ke projection publik, feed, listing, atau store.
- Migration tetap menggunakan command `set_location` yang sudah melakukan validasi panjang dan batas wilayah.

## Hasil

- Test UI onboarding memverifikasi alamat privat dimuat kembali pada akun lengkap.
- pgTAP static test menambahkan assertion untuk penyimpanan dan projection owner.
- Runtime PostgreSQL belum dapat dijalankan karena Docker Desktop Linux Engine/API belum merespons.
