# Rencana: preview alamat publik toko

Status: selesai di branch `feat/barter-webapp`; perubahan belum dipush.

## Tujuan

Memenuhi PDR UI-08 dengan memberi pemilik toko preview dan konsekuensi yang jelas sebelum alamat usaha ditampilkan ke publik.

## Keputusan implementasi

- Preview dibuat dari state form lokal dan tidak memanggil endpoint publik tambahan.
- Preview hanya muncul jika consent aktif dan alamat tidak kosong.
- Teks menjelaskan bahwa alamat dapat dilihat pengunjung; menghapus consent tetap mengirim alamat sebagai null melalui RPC yang sudah ada.
- Tidak mengubah kebijakan lokasi perkiraan maupun projection publik.

## Langkah

1. [x] Tambahkan test form preview yang gagal.
2. [x] Tambahkan preview mobile dan styling ringan.
3. [x] Jalankan full verification dan siapkan commit lokal.

## Hasil verifikasi

- 46 file / 153 unit test lulus.
- Production build lulus; warning chunk >500 kB tetap dicatat sebagai optimasi lanjutan.
- 26 E2E lulus dan 1 skenario desktop-only dilewati.
- Audit dependency produksi menemukan 0 vulnerability.
- Verifikasi database runtime tetap tertahan karena Docker Desktop Linux Engine/API belum tersedia.
