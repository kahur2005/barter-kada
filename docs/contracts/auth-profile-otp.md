# Kontrak Auth, Profil, dan Lokasi

Status: implementasi frontend dan adapter unit-tested; migration Supabase menghapus OTP WhatsApp sebagai syarat onboarding.

## Batas kepercayaan

- Supabase Auth adalah sumber identitas. Email/password dan Google OAuth hanya menghasilkan sesi.
- Nama dan area/lokasi wajib lengkap sebelum route memasang listing, chat, Plus, notifikasi, dan transaksi dibuka.
- Google `user_metadata` boleh membantu prefill di masa depan, tetapi tidak menentukan kelengkapan atau hak akses.
- `public.profiles` dan `public.service_areas` hanya memuat data aman. Alamat, koordinat, dan status akun berada di schema `private` yang tidak diekspos Data API.
- Nomor telepon bersifat opsional dan tidak diperlukan untuk mengakses fitur Barter.

## Konfigurasi browser

Hanya `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` yang boleh masuk bundle. Semua key server dan secret dilarang memakai awalan `VITE_`.

## RPC pengguna

- `get_my_onboarding()` → `{nextStep, displayName, bio, areaId, maskedPhone, phoneVerified}`. `maskedPhone` dan `phoneVerified` dipertahankan untuk kompatibilitas payload lama, tetapi tidak lagi menentukan `nextStep`.
- `complete_profile(p_display_name, p_bio)` mengikat perubahan ke `auth.uid()`.
- `set_location(p_area_id, p_latitude, p_longitude, p_address)` mengikat perubahan ke `auth.uid()` dan menolak titik di luar polygon wilayah aktif.

Tabel publik tidak memberi grant DML langsung kepada `authenticated`. Command privat tetap memeriksa actor dari JWT.

## Verifikasi yang masih wajib

1. Jalankan `supabase db reset`, `supabase test db`, dan database advisors saat Docker aktif.
2. Pastikan migration `remove_openwa_otp_requirement` sudah diterapkan ke project Supabase Barter.
3. Impor polygon Jabodetabek dari sumber resmi beserta versi; jangan mengaktifkan Kepulauan Seribu.
