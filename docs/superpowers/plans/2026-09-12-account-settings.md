# Rencana: pengaturan akun dan penggantian nomor

## Tujuan

Menutup alur PRD yang sudah memiliki dukungan server tetapi belum punya UI setelah onboarding: pengguna dapat memperbarui nama/bio, mengganti lokasi privat dengan izin eksplisit, dan mengganti nomor WhatsApp melalui OTP `change_phone`.

## Batasan

- Tetap memakai RPC `complete_profile` dan `set_location` yang sudah ada.
- OTP tetap dikirim melalui Edge Function OpenWA; UI tidak menganggap pengiriman sebagai verifikasi.
- Tidak menampilkan nomor atau alamat privat kepada pengguna lain.
- Tidak menambah jalur pemulihan akun atau mengubah kebijakan identity linking yang masih terbuka.

## Langkah

1. Tambahkan test UI untuk pengaturan akun lengkap dan pastikan penggantian nomor mengirim purpose `change_phone`.
2. Pisahkan komponen onboarding agar dapat dipakai ulang dalam mode setup dan mode edit.
3. Tampilkan panel edit profil, lokasi, dan nomor pada state akun yang sudah lengkap.
4. Verifikasi test, build, E2E, audit, dan diff; catat bukti serta batas runtime Supabase.
