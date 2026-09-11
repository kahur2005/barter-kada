# Kontrak Auth, Profil, Lokasi, dan OTP

Status: implementasi frontend dan adapter unit-tested; migrasi/RLS serta Edge Function belum diverifikasi pada runtime lokal karena Docker Engine dan Deno tidak tersedia.

## Batas kepercayaan

- Supabase Auth adalah sumber identitas. Email/password dan Google OAuth hanya menghasilkan sesi.
- Nama, area, dan verifikasi WhatsApp wajib lengkap sebelum route memasang listing, chat, Plus, notifikasi, dan transaksi dibuka.
- Google `user_metadata` boleh membantu prefill di masa depan, tetapi tidak menentukan kelengkapan atau hak akses.
- `public.profiles` dan `public.service_areas` hanya memuat data aman. Nomor, alamat, koordinat, status akun, OTP digest, IP hash, serta reference provider berada di schema `private` yang tidak diekspos Data API.
- OpenWA menerima permintaan pengiriman; respons 201 bukan bukti pesan terkirim dan bukan verifikasi nomor.

## Konfigurasi browser

Hanya `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` yang boleh masuk bundle. Semua key server, pepper, dan credential OpenWA dilarang memakai awalan `VITE_`.

## RPC pengguna

- `get_my_onboarding()` → `{nextStep, displayName, bio, areaId, maskedPhone, phoneVerified}`.
- `complete_profile(p_display_name, p_bio)` mengikat perubahan ke `auth.uid()`.
- `set_location(p_area_id, p_latitude, p_longitude, p_address)` mengikat perubahan ke `auth.uid()` dan menolak titik di luar polygon wilayah aktif.

Tabel publik tidak memberi grant DML langsung kepada `authenticated`. Command privat tetap memeriksa actor dari JWT.

## Edge Function `otp`

Endpoint menerima POST JSON dengan bearer JWT:

```ts
type OtpRequest =
  | { action: 'request'; phone: string; purpose: 'register' | 'change_phone' }
  | { action: 'verify'; challengeId: string; code: string };
```

Request berhasil mengembalikan `challengeId`, `expiresAt`, `resendAt`, dan `deliveryStatus: accepted | failed | unknown`; nomor dan kode tidak dikembalikan. Verify mengembalikan status server dan `onboarding` hanya saat cocok. User ID di body diabaikan; actor selalu berasal dari validasi bearer token.

OpenWA menggunakan `POST /api/sessions/{sessionUUID}/messages/send-text`, header `X-API-Key`, dan payload `{chatId,text}`. Challenge/HMAC dikomit sebelum panggilan jaringan. OTP enam digit berlaku lima menit, cooldown 60 detik, maksimal lima percobaan, dan maksimal lima permintaan per jam berdasarkan policy privat.

## Variabel server

Lihat `supabase/functions/.env.example`: `APP_ORIGIN`, dua pepper independen, `OPENWA_BASE_URL`, `OPENWA_API_KEY`, dan `OPENWA_SESSION_ID`. Gunakan sesi OpenWA serta nomor WhatsApp khusus pengujian karena gateway ini tidak resmi dan dapat menimbulkan restriction pada akun.

## Verifikasi yang masih wajib

1. Jalankan `supabase db reset`, `supabase test db`, dan database advisors saat Docker aktif.
2. Jalankan `supabase functions serve otp` dengan environment lokal aman dan user uji nyata.
3. Uji satu pengiriman memakai akun OpenWA khusus serta nomor penerima yang mengizinkan tes; jangan gunakan nomor pribadi operator.
4. Impor polygon Jabodetabek dari sumber resmi beserta versi; jangan mengaktifkan Kepulauan Seribu.
