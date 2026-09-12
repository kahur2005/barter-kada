# Rencana: navigasi area akun

Status: selesai di branch `feat/barter-webapp`; belum dipush.

## Tujuan

Memenuhi PDR UI-08 dengan membuat semua area utama akun dapat ditemukan dari halaman Akun di mobile maupun desktop.

## Keputusan implementasi

- Link tetap memakai route yang sudah dilindungi `RequireCompletedProfile`; navigasi tidak mem-bypass autentikasi atau kelengkapan profil.
- Menu mencakup profil/verifikasi, listing pribadi, toko, Plus, transaksi, dan notifikasi.
- Ikon notifikasi global tetap dipertahankan; menu akun diberi landmark `Menu akun` agar aksesibilitas dan test tidak ambigu.

## Hasil

- Test `AccountPage.test.tsx` memverifikasi seluruh tujuan navigasi.
- Perubahan hanya pada UI account hub; tidak mengubah gateway atau policy backend.
