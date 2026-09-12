# Implementasi Barter

Tujuan aktif: membangun web app sesuai PRD, RFC-001, dan PDR-001, bukan hanya prototype visual. Seluruh scope tetap berlaku; tahap di bawah adalah urutan integrasi, bukan pengurangan fitur.

Mulai: 11 September 2026. Baseline: `187af23`. Branch: `feat/barter-webapp`, folder repository yang sama sesuai pilihan pengguna.

## Status dan bukti

| Tahap | Keluaran | Acuan | Status |
| --- | --- | --- | --- |
| 1 | React/Vite/TypeScript, shell mobile, penemuan/detail/toko read-only, adapter API, test harness | PDR UI-01/02, T-27/46/55 | Selesai dan diverifikasi sebagai fondasi read-only; backend belum terhubung |
| 2 | Supabase lokal/demo, schema/grants/RLS, auth Google/email, profil/lokasi privat dan OTP OpenWA | PRD 3–5, RFC 5/11/12, T-01/12/20/21/22/23 | Diimplementasikan dan unit-tested; SQL/Edge runtime serta pengiriman nyata belum terverifikasi karena Docker, Deno, credential, dan polygon resmi belum tersedia |
| 3 | Listing draft/publish/edit/archive, varian, upload/EXIF, discovery PostGIS dan katalog | PRD 7/8/11, T-24/25/26/27/34/35 | Diimplementasikan untuk listing personal; verifikasi runtime Supabase tertahan Docker dan store catalogue menunggu tahap Plus |
| 4 | Chat persisted/realtime, read cursor, notification center dan block policy | PRD 13, T-13/16/39/40/41 | Chat privat, media, read cursor, Realtime invalidation, in-app notification center, event notification server-side, dan idempotent reminder worker diimplementasikan; runtime Supabase belum diverifikasi |
| 5 | Barter versioned, dua siap/dua setuju, atomic inventory, penerimaan/topup/cancel | PRD 9/14, T-02/03/04/14/15/29/30/31 | Diimplementasikan dan unit-tested; runtime Supabase/pgTAP masih tertahan Docker |
| 6 | Sale/free/PO/catering, quote, DP/balance manual, quota dan handover | PRD 10–12, T-05/06/07/08/32/33/34/35/36/37/38 | Fondasi sale/free/PO quote, reservasi, DP manual, balance, handover, pembatalan sebelum proses, permintaan pembatalan pascaproses, amendment sebelum proses, dan refund offline setelah pembatalan diimplementasikan; keputusan admin dan kebijakan refund final tetap terbuka |
| 7 | Tiga toko, Plus dummy, expiry, limits dan promosi per akun | PRD 6/8, T-09/10/11/18/28/47/48 | Plus dummy, entitlement expiry, maksimal tiga toko, profil toko, katalog, selector penerbit, batas produk toko dan rotasi promosi per akun diimplementasikan; runtime database belum diverifikasi |
| 8 | Reports/evidence/admin/sanctions, reviews, assistance dan tindak lanjut | PRD 14/15, T-17/19/42/43/44 | Reports dengan evidence scoped, review pending/publish window, daftar ulasan, balasan satu kali, reputation aggregate, admin case queue/detail/decision version, restriction/ban foundation, dan scheduler publikasi/reminder diimplementasikan; runtime database belum |
| 9 | Amend/refund bersyarat, event/metrics dan operational configuration | RFC 22–24, T-49/50/51/52/53/54 | Admin limits/version history, product event privacy boundary, activity-day retention, listing visibility periods, live metrics RPC, halaman `/admin/analytics`, rating toko terpisah, amendment pre-processing, dan ledger refund offline diimplementasikan; runtime database belum diverifikasi |
| 10 | E2E dua akun, RLS/race/security, mobile/a11y, build Vercel, panduan/demo evidence | Semua requirement R yang berlaku; T-45/46/55; UX-01–13 | Frontend unit/build/E2E/audit terverifikasi; dua akun, RLS/race, Supabase runtime, dan deployment Vercel masih belum diverifikasi |

Skenario T merupakan kelompok, bukan jumlah tes yang otomatis membuktikan seluruh PRD. Saat bagian selesai, catat path test, command, hasil, commit dan keterbatasannya. Matrix 244 R tetap sumber audit akhir; jangan mengubah semua status menjadi selesai berdasarkan build frontend.

## Keputusan eksekusi dan batas

- Pilihan pengguna: bekerja pada branch fitur di folder sekarang, tidak membuat worktree baru.
- React + TypeScript + Vite mengikuti rekomendasi RFC; desain mengikuti token/layout PDR. Paket dipin dengan lockfile.
- Preview data sintetis hanya untuk memeriksa UI read-only secara eksplisit. Default build menggunakan Supabase; tanpa konfigurasi menampilkan masalah konfigurasi, bukan diam-diam memakai data contoh. Preview tidak boleh menyatakan auth, pengiriman chat, OTP, pembayaran, persetujuan, atau persistence berhasil.
- Supabase cloud yang ditemukan belum ada yang diidentifikasi pengguna sebagai Barter. Tidak ada perubahan pada proyek cloud lain. Docker CLI terpasang, tetapi engine belum merespons saat pemeriksaan awal.
- Docker Desktop sempat dicoba dijalankan, tetapi Linux engine tetap tidak menyediakan pipe API. Pengguna perlu memastikan engine aktif atau menunjuk proyek Supabase khusus; kode dan tes nonintegrasi tetap dilanjutkan.
- D-01–16/Q-01–31 tetap terbuka sesuai dokumen. Fondasi boleh memakai parameter draft yang diberi label dan dapat diganti. Kebijakan keamanan, hak refund, ban/recovery, dan aksi cloud berbiaya tidak diputuskan diam-diam.
- Belum melakukan push, merge ke main, deployment publik, atau mengirim OTP nyata untuk tahap implementasi ini.

## Rencana per subsystem

- [Fondasi frontend dan penemuan](superpowers/plans/2026-09-11-frontend-foundation.md).
- [Auth, profil, lokasi privat, dan WhatsApp OTP](superpowers/plans/2026-09-11-auth-profile-otp.md).
- [Publikasi dan pengelolaan listing](superpowers/plans/2026-09-11-listing-publishing.md).
- [Chat privat dan realtime](superpowers/plans/2026-09-12-private-chat.md).
- [Notifikasi, review, dan admin case minimum](superpowers/plans/2026-09-12-notifications-reviews.md).
- [Amendment order dan refund offline](superpowers/plans/2026-09-12-amendment-refund.md).
- Rencana subsystem berikut diturunkan dari tahap 5–10 sebelum kode subsystem terkait dimulai; status belum dibuat di atas tetap aktif sampai ada bukti implementasi.

## Lingkungan yang harus dipenuhi sebelum verifikasi end-to-end

1. Database Supabase lokal sehat atau proyek demo yang secara eksplisit ditunjuk; migrations, test roles dan seed sintetis tersedia.
2. Google OAuth/email redirect dikonfigurasi pada origin demo; tidak mengarang credential.
3. Host OpenWA HTTPS, sesi aktif, API key server-only, pepper dan nomor uji yang diizinkan untuk tes delivery WhatsApp nyata.
4. Vercel preview terhubung ke Supabase demo setelah target deployment ditentukan; dummy billing tidak tersedia live.

## Catatan pembacaan

PRD v1.3, RFC-001 v1.1 dan PDR-001 v0.1 telah dibaca untuk menyusun urutan ini. Changelog Supabase diperiksa; extension memakai versi default tersedia, tidak menulis objek aplikasi ke schema realtime. Referensi API/library diperiksa kembali pada setiap subsystem, bukan mengandalkan signature dari mockup.

## Bukti tahap 1

Implementasi berada pada branch `feat/barter-webapp`. Verifikasi 11 September 2026:

- `npm.cmd test`: 7 file, 39 tes lulus.
- `npm.cmd run build`: TypeScript dan Vite production build lulus; bundle entry 101,15 kB gzip, di bawah usulan anggaran awal feed 200 kB gzip.
- `npm.cmd run test:e2e`: 20 tes lulus dan 1 tes khusus mobile dilewati pada proyek desktop; Playwright menguji 320, 390, dan 1280 px—search/filter, dialog Escape/focus return, detail/back dengan scroll restoration, toko/katalog/PO, empty state, CTA pending yang jujur, urutan detail, posisi kontrol galeri, overflow, dan navigasi responsif.
- `npm.cmd audit --omit=dev`: 0 kerentanan dependency produksi yang terdeteksi.
- Pemeriksaan langsung browser: konten bermakna tampil, tidak ada error page/overlay Vite, tidak ada horizontal overflow; screenshot mobile dan desktop ditinjau. Hasil review memicu perbaikan urutan informasi detail mobile dan posisi tombol galeri desktop. Audit axe pada home serta detail mobile: 0 violation/0 incomplete untuk tag WCAG 2 A/AA dan WCAG 2.2 AA; ini bukan pengganti uji keyboard/screen reader manual.

Scope bukti ini hanya tahap 1. Preview menggunakan fixture sintetis; RPC di `docs/contracts/discovery-api.md` masih provisional dan belum membuktikan Supabase, Auth, RLS, OTP, chat, transaksi, atau persistence.

## Bukti parsial tahap 2

Implementasi 11 September 2026 menambahkan Supabase Auth gateway untuk email/password dan Google, callback/onboarding tiga tahap, consent lokasi eksplisit, action gate, logout, migrasi privacy/RLS/OTP, Edge Function, serta adapter OpenWA. Bukti yang dapat dijalankan pada host ini:

- `npm.cmd test`: 15 file, 73 tes lulus; helper/handler OTP 22 tes, auth/onboarding/action gate/provider 12 tes.
- `npm.cmd run build`: lulus; bundle utama 129,85 kB gzip.
- `npm.cmd run test:e2e`: 26 tes lulus pada lebar 320, 390, dan desktop; 1 skenario khusus mobile dilewati pada desktop. Inspeksi langsung halaman login mode preview menunjukkan pesan nonfungsional yang eksplisit dan tidak menampilkan form akun palsu.
- `supabase start`: gagal sebelum menjalankan migration/test karena pipe Docker Desktop Linux Engine tidak tersedia.
- `deno --version`: command tidak tersedia pada host, sehingga `deno check` dan Edge Function serve belum dijalankan.

Karena dua runtime tersebut tidak tersedia, tahap 2 belum boleh dianggap selesai. SQL di migration sudah memiliki 19 assertion pgTAP tetapi belum pernah dieksekusi; Edge handler/adapter unit-tested melalui dependency injection tetapi belum diuji dengan Supabase/OpenWA nyata. `supabase/seed.sql` sengaja tidak menebak polygon Jabodetabek.

## Bukti parsial tahap 3

Implementasi 11 September 2026 menambahkan wizard listing personal untuk jual/barter/gratis, ready stock/PO/catering, validasi shared frontend/backend, draft dan publish dengan optimistic version, batas listing aktif dari server, halaman listing milik pengguna, serta archive yang menolak listing reserved. Pipeline media memakai bucket karantina privat, pemroses Node.js Vercel dengan `sharp`, batas 5 MB/2.048 px, re-encode WebP tanpa EXIF, dan commit aset oleh service role sebelum aset dapat dipakai untuk publikasi.

- `npm.cmd test -- --run`: 21 file, 93 tes lulus. Termasuk validasi listing, editor/owner UI, adapter upload, normalisasi media, dan boundary endpoint.
- `npm.cmd run build`: TypeScript dan Vite production build lulus; bundle utama 135,49 kB gzip.
- `npm.cmd run test:e2e`: 26 tes lulus pada lebar 320, 390, dan desktop; 1 skenario khusus mobile dilewati pada desktop.
- Inspeksi screenshot editor 390 × 844 menunjukkan layout mobile terbaca, stepper dan CTA sticky tampil tanpa horizontal overflow.
- Migration listing berisi 19 assertion pgTAP dan migration media berisi 8 assertion pgTAP, tetapi belum dijalankan karena Docker engine masih tidak tersedia. Endpoint Vercel belum diuji terhadap proyek Supabase nyata karena proyek dan server secret belum ditunjuk.

Tambahan 12 September 2026: editor kini memuat listing owner beserta optimistic version, menjaga listing aktif tetap aktif saat menyimpan perubahan, menyediakan area catering dari backend dan kuota PO, serta mengirim jadwal lokal sebagai WIB eksplisit. RPC search/detail memakai lokasi tepat requester hanya di fungsi privat, centroid area untuk lokasi seller, cursor terikat filter, dan DTO publik tanpa koordinat/nomor telepon; adapter membentuk URL hanya dari path media WebP canonical. Test frontend bertambah menjadi 98. Tahap 3 belum dinyatakan terverifikasi end-to-end sampai 11 assertion pgTAP discovery dan migration terkait berhasil dijalankan pada Supabase.

## Bukti parsial tahap 4

Implementasi 12 September 2026 menambahkan conversation per listing dan pasangan user, inbox/unread, urutan pesan server-side, retry idempoten, read cursor monoton, pagination riwayat, Realtime sebagai invalidation setelah commit, blokir dua arah, serta foto chat privat. Foto dibatasi empat per pesan dan 5 MB per file, melewati bucket karantina, diubah menjadi WebP tanpa EXIF, kemudian dibaca participant melalui signed URL 60 detik.

- `npm.cmd test -- --run`: 24 file, 109 tes lulus sebelum commit tahap; mencakup gateway, UI chat, endpoint media, normalisasi, dan regresi fitur sebelumnya.
- `npm.cmd run build`: TypeScript dan Vite production build lulus; bundle utama tetap di bawah anggaran awal 200 kB gzip.
- `npm.cmd run test:e2e`: 26 skenario lulus pada mobile 320/390 dan desktop; 1 pemeriksaan urutan khusus mobile dilewati pada desktop. Skenario preview memastikan CTA chat tidak membuat percakapan palsu ketika backend tidak terhubung.
- Dua migration chat disertai 44 assertion pgTAP untuk membership/RLS, idempotensi, sequence, cursor, blokir, media privat, dan anti-forgery. Assertion belum dijalankan karena Docker Linux engine belum tersedia.
- Laporan dari chat sementara menuju halaman status jujur; evidence case dan admin panel dibangun pada tahap moderasi. Notification jobs juga belum dibuat, sehingga tahap 4 masih parsial.

## Bukti parsial tahap 5–7

Implementasi 12 September 2026 menambahkan tiga subsystem berikut:

- Barter immutable revision: package listing/direct privat, reset Siap/Setuju pada revisi, dua readiness + dua approval, atomic reservation, receipt barang, top-up payee-only, cancel sebelum receipt, dan editor revisi.
- Order quote: seller membuat snapshot harga/jumlah/ongkir/DP dari percakapan, buyer mengonfirmasi, server memeriksa minimum/window/kuota, reservasi dibuat atomik, seller mengakui DP/pelunasan manual, lalu processing → ready → handover → receipt.
- Plus/store: harga server Rp20.000/bulan, dummy QRIS/VA dengan label jangan transfer, entitlement aktif/expired, maksimum tiga toko, RLS/public visibility, profil usaha, dan penerbit toko pada wizard listing.

Bukti host:

- `npm test`: 31 file, 121 tes lulus.
- `npm run build`: lulus; bundle entry 147,36 kB gzip.
- `npm audit --omit=dev`: 0 kerentanan produksi.
- `npm run test:e2e`: 26 lulus, 1 dilewati karena skenario desktop-only; suite memakai lebar 320, 390, dan desktop.
- Migration tambahan menyertakan pgTAP: barter 26 assertion, order 15 assertion, Plus/store 14 assertion. Belum dieksekusi karena Docker Linux engine/Supabase lokal tidak tersedia; hasil ini tidak boleh disebut verifikasi database runtime.

Batas yang masih eksplisit pada checkpoint ini: scheduled notifikasi jobs, pembatalan/refund order, amendmen setelah DP/processing, analytics, store rating terpisah, dan verifikasi OpenWA/QRIS/VA nyata belum selesai.

## Bukti parsial tahap 8

Implementasi lanjutan 12 September 2026 menambahkan pusat notifikasi in-app, trigger deduplikasi untuk pesan/event barter/event order, submit review pascatransaksi dengan target counterpart dari server, aggregate reputasi pada projection listing/toko, scoped report evidence, role admin private, antrean/detail kasus, optimistic decision version, audit keputusan, dan restriction/ban yang diperiksa oleh `assert_active_account`.

- `npm test`: 40 file, 131 tes lulus.
- `npm run build`: lulus; bundle entry 151,15 kB gzip; warning chunk >500 kB masih dicatat sebagai optimasi lanjutan.
- `npm run test:e2e`: 26 lulus, 1 dilewati karena skenario desktop-only; suite tetap memakai lebar 320, 390, dan desktop.
- Migration/tap test baru: notifications/reviews 14 assertion dan admin cases 18 assertion. Belum dieksekusi karena Docker Linux engine/Supabase lokal masih tidak tersedia.

Batas penting: keputusan return/cancel yang benar-benar mengubah fulfillment/refund, amendmen pasca-DP, dan runtime/RLS integration test tetap belum selesai. Pembatalan order yang sudah mengakui pembayaran hanya menandai tindak lanjut refund antar pihak; tidak ada transfer atau refund otomatis.

Daftar transaksi participant-scoped (`/transactions`) juga ditambahkan dari Akun. Migration dan pgTAP statisnya ada di `20260912075000_transaction_index.sql` dan `transaction_index.test.sql`; verifikasi database runtime tetap tertahan karena Docker Linux engine belum tersedia.

## Bukti parsial tahap 7–9 lanjutan

Implementasi berikutnya menambahkan migration `20260912082000_admin_settings_limits.sql`, `20260912083000_store_listing_publish_limits.sql`, `20260912084000_plus_promotion_rotation.sql`, dan `20260912085000_reviews_lifecycle_replies.sql`. Cakupannya: panel `/admin/settings/limits` dengan optimistic version, audit history immutable, batas produk toko server-side, promotion rotation maksimal satu slot per sepuluh listing dan satu akun per slot, review barter pending hingga kedua pihak/14 hari, scheduled publication RPC untuk service role, daftar review publik, serta balasan pemilik satu kali.

- `npm.cmd test -- --run`: 42 file, 139 tes lulus.
- `npm.cmd run build`: lulus; bundle entry 154,19 kB gzip; warning chunk >500 kB masih dicatat sebagai optimasi lanjutan.
- Migration/tap test baru: admin settings 18 assertion, promotion 16 assertion, review lifecycle/replies 18 assertion, system jobs 25 assertion, product events/metrics 35 assertion, dan store ratings 17 assertion. Belum dieksekusi karena Docker Linux engine/Supabase lokal masih tidak tersedia.
- Order cancellation workflow memiliki 17 assertion pgTAP; reservasi/obligation yang masih due dilepas atomik, sementara pembayaran yang sudah diakui hanya ditandai perlu tindak lanjut langsung antar pihak.
- `20260912090000_system_jobs_and_reminders.sql` menambahkan queue idempotent dengan retry/lease, trigger untuk review/DP/Plus, dan registrasi Cron kondisional melalui `cron.schedule`; target Supabase tertentu belum ditunjuk sehingga belum ada runtime proof.
- `20260912091000_product_events_metrics.sql` menambahkan event allowlist tanpa PII, activity-day cohort, listing visibility periods, dan RPC admin `get_product_metrics`; UI agregat tersedia di `/admin/analytics`. Metrik sengaja mengecualikan `is_test`, tetapi backfill historical event selain listing visibility belum dilakukan.
- `20260912092000_store_ratings.sql` menautkan review order ke katalog toko melalui `store_id`, mengganti projection rating toko agar tidak mengambil rating personal pemilik, dan menyediakan ulasan toko scoped di `/reviews?storeId=...`.

## Bukti parsial tahap 4/8/9: jobs dan metrics

Implementasi 12 September 2026 menambahkan `private.system_jobs`, retry maksimal tiga kali dengan lease stale 10 menit, handler publikasi review tertunda, reminder DP 24 jam sebelum tenggat/ketika sudah overdue, dan reminder Plus tiga hari sebelum expiry. Queue tidak dapat dibaca role browser; hanya `service_role` yang diberi execute pada worker. Registrasi Cron bersifat kondisional dan idempotent sehingga migration tidak memaksa extension pada lingkungan yang belum menyediakan pg_cron.

Product analytics menyimpan event terstruktur dengan source key idempotent, activity day tanpa isi pesan/nomor telepon/alamat, periode visibilitas listing per area, dan RPC admin yang mengembalikan transaksi selesai, listing aktif mingguan, response chat, retention D7/W1, store aktif, serta Plus aktif. Halaman admin menggunakan rentang tanggal eksplisit dan tidak menampilkan payload event mentah.

Bukti host:

- `npm.cmd test -- --run`: 42 file, 139 tes lulus.
- `npm.cmd run build`: lulus; entry 154,19 kB gzip.
- `npm.cmd run test:e2e`: 26 lulus, 1 dilewati pada skenario desktop-only.
- `git diff --check`: tidak menemukan whitespace error; warning CRLF dari Git tidak memengaruhi isi.
- `supabase start` masih tidak dapat dijalankan karena Docker Linux engine tidak tersedia; seluruh assertion pgTAP pada dua migration baru masih static-only.

## Bukti parsial tahap 6/9: amendment dan refund offline

Implementasi 12 September 2026 menambahkan `20260912093000_order_amendments.sql` dan `20260912094000_offline_refunds.sql`. Amendment menyimpan proposal sebagai revisi order baru tanpa menghapus revisi lama, hanya dapat diajukan penjual pada status `confirmed`/`awaiting_dp`, dan harus diterima pembeli dengan expected revision. Acceptance melepas hold/obligation lama yang masih terbuka, memvalidasi ulang stok, lalu membuat snapshot revisi dan obligation baru secara atomik. Perubahan setelah proposal tidak dapat memakai persetujuan lama.

Refund dipisahkan dari state fulfillment: nominal harus eksplisit dan dibatasi oleh pembayaran direct yang sudah diakui dikurangi refund yang sudah dikonfirmasi. Alurnya `proposed → accepted → sent_unconfirmed → confirmed`; Barter tidak menerima, menahan, memindahkan, atau membalikkan uang. Basis `cancellation` mensyaratkan order sudah cancelled, basis `amendment` mensyaratkan amendment accepted, dan basis `admin_decision` hanya dapat dibuat admin. Ledger dan proposal tidak memiliki field gateway/platform balance serta tidak memiliki direct table grant untuk browser.

RPC utama: `propose_order_amendment`, `accept_order_amendment`, `reject_order_amendment`, `withdraw_order_amendment`, `propose_refund`, `accept_refund`, `reject_refund`, `record_refund_sent`, dan `confirm_refund_received`. UI mobile tersedia di `/orders/:id/amend` dan `/orders/:id/refund`, termasuk review proposal pembeli, status transfer offline, dan konfirmasi penerimaan.

Bukti host pada checkpoint ini:

- `npm.cmd test -- --run`: 44 file, 144 tes lulus.
- `npm.cmd run build`: TypeScript dan Vite production build lulus; entry 155,95 kB gzip; warning chunk >500 kB masih dicatat sebagai optimasi lanjutan.
- `npm.cmd run test:e2e -- --workers=1`: 26 lulus, 1 dilewati karena skenario desktop-only.
- `npm.cmd audit --omit=dev`: 0 kerentanan dependency produksi.
- `supabase/tests/order_amendments_refunds.test.sql`: 45 assertion pgTAP static-only; binary global `supabase` tidak tersedia, tetapi package-pinned `npm.cmd exec --yes --package=supabase@2.117.0 -- supabase --version` menghasilkan `2.117.0`. `supabase start` tetap tertahan karena Docker Desktop Linux Engine tidak merespons, sehingga migration, RLS, race, dan RPC belum diuji pada PostgreSQL.

Q-12/Q-17 tetap tidak dikunci diam-diam: kebijakan pengembalian nominal dan keputusan admin final masih memerlukan keputusan produk/legal. Implementasi saat ini hanya menyediakan ledger proposal, consent, bukti catatan transfer opsional, dan konfirmasi penerima.
