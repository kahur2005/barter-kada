# RFC-001 — Arsitektur dan Eksekusi Teknis Barter

Status: **Draft untuk ditinjau**  
Revisi dokumen: **1.1 — pelengkapan cakupan dan traceability**
Tanggal revisi: **11 September 2026**
Tanggal: 10 September 2026  
Acuan produk: [PRD v1.3](./PRD.md)  
Target: demo terintegrasi, 9 hari × 3 jam; belum menerima transaksi nyata  
Lingkup perubahan saat penyusunan RFC: dokumentasi saja

Lampiran normatif rancangan: [Matriks PRD → RFC → data/API → tes → prioritas demo](./RFC-001-matriks-cakupan.md). Revisi 1.1 melengkapi rincian di bagian 21–25. Persetujuan pengguna untuk melengkapi dokumen tidak diperlakukan sebagai persetujuan otomatis D-01–D-16 atau kebijakan produk lain yang masih terbuka. Seluruh tes dalam dokumen ini masih rencana.

## 1. Ringkasan keputusan

RFC ini mengusulkan aplikasi React + TypeScript + Vite di Vercel, dengan Supabase Auth, PostgreSQL, Storage, Realtime, Edge Functions, dan Cron. OpenWA milik rmyndharis berjalan sebagai layanan terpisah untuk mengirim OTP WhatsApp.

Aturan transaksi dijalankan melalui fungsi database yang atomik. Browser tidak boleh langsung mengubah status kesepakatan, reservasi, penerimaan pembayaran, verifikasi nomor, sanksi, atau hak Plus. Realtime membantu memperbarui tampilan; database tetap menjadi sumber kebenaran.

Tiga skenario demonstrasi yang direkomendasikan: barter dua pihak dengan perubahan penawaran dan tambahan uang; PO berkuota dengan DP; aktivasi tiga toko melalui Plus dummy. Ini adalah **usulan prioritas RFC**, bukan keputusan bahwa fitur lain dibatalkan. Pilihan prioritas final masih terbuka pada PRD.

Keputusan teknis di RFC ini adalah rekomendasi yang dapat diimplementasikan. Perubahan yang berdampak pada perilaku produk diberi ID D-xx pada bagian 3, sehingga tidak dianggap sebagai persetujuan produk baru.

## 2. Tujuan dan bukan tujuan

### 2.1 Tujuan

- Mengubah keputusan PRD menjadi batas modul, model data, perintah, dan aturan perubahan status yang jelas.
- Menjamin persetujuan berlaku atas penawaran yang benar-benar dilihat pengguna.
- Mencegah barang/kuota yang sama disepakati melebihi ketersediaan.
- Menjaga lokasi, nomor HP, chat, dan bukti transaksi sesuai hak akses.
- Memisahkan transaksi antar pengguna dari pembayaran langganan platform.
- Memungkinkan demo lintas akun dengan status yang tersimpan, bukan simulasi tampilan semata.

### 2.2 Bukan tujuan

- Escrow, transfer uang transaksi barang, pembuktian transfer otomatis, atau payment gateway nyata.
- Aplikasi native, push notification, staf toko, integrasi kurir, atau WhatsApp untuk notifikasi transaksi.
- Menjamin kesiapan publik dalam 27 jam.
- Microservices untuk setiap domain, event sourcing penuh, atau mesin rekomendasi berbasis ML.
- Menetapkan keputusan hukum atau mengirim laporan polisi otomatis.

## 3. Asumsi dan rekomendasi produk yang belum final

Rekomendasi berikut membuat rancangan dapat ditinjau dan dihitung. Saat diputuskan, sinkronkan dengan PRD sebelum implementasi perilaku terkait. Fondasi yang tidak bergantung pada keputusan tersebut dapat dikerjakan lebih dulu.

| ID | Rekomendasi RFC | Dampak / hal yang perlu ditinjau |
| --- | --- | --- |
| D-01 | Profil wajib nama, nomor terverifikasi, area administratif, dan titik peta; alamat jalan opsional | PRD belum mengunci tingkat detail alamat |
| D-02 | Pengunjung boleh membaca penawaran; publikasi hanya di Jabodetabek; pilihan radius 5/10/20/50 km | Area akun di luar cakupan tidak otomatis ditolak; radius berbasis lokasi perkiraan |
| D-03 | Revisi setelah Disepakati boleh dibuka sebelum penyerahan dan sebelum pembayaran tercatat; persetujuan direset, reservasi lama dipertahankan sampai revisi diterima/dibatalkan | Sesudah pembayaran tercatat, demo memakai permintaan perubahan lewat chat/admin; editor langsung dinonaktifkan, bukan mengubah tagihan lama |
| D-04 | Produk berkuota boleh diedit untuk penawaran baru; pesanan yang sudah ada tetap memakai snapshot lama | Menghindari semua katalog PO terkunci karena satu pesanan |
| D-05 | Satu listing PO mempunyai satu batch aktif; batch berikutnya dibuat setelah batch lama ditutup | Tidak ada scheduler PO berulang otomatis |
| D-06 | Plus berlaku satu bulan kalender, zona Asia/Jakarta, tanggal akhir bulan di-clamp; tanpa auto-debit | Harga tetap Rp20.000; aturan akhir bulan perlu disepakati |
| D-07 | Setelah Plus habis, chat lama terbuka tetapi toko tidak boleh menerima kesepakatan baru; transaksi yang sudah disepakati tetap berjalan | Draft negosiasi tersimpan, menunggu Plus aktif kembali |
| D-08 | Blokir mencegah chat/negosiasi baru; kanal transaksi aktif dan sengketa tetap tersedia dengan pembatasan kontekstual | Ban memberi akses hanya ke penyelesaian kasus sendiri, bukan kegiatan marketplace |
| D-09 | Admin melihat pesan bertag transaksi yang dilaporkan dan pesan yang secara eksplisit dilampirkan sebagai bukti | Chat umum atau transaksi lain tidak otomatis terbuka; permintaan bukti tambahan dicatat |
| D-10 | OTP 6 digit, 5 menit, resend 60 detik, maksimal 5 salah per challenge | Tambahkan batas per akun/nomor/IP; gagal terkirim tidak memverifikasi nomor |
| D-11 | Gambar maksimum 8 per listing/barang, 5 MB per unggahan; JPEG/PNG/WebP | Dibutuhkan pengolahan server untuk menghapus metadata lokasi; tidak ada video/PDF dalam demo |
| D-12 | Minimum PO memakai satuan homogen; DP 1–100% atau tidak ada, dibulatkan ke atas ke rupiah utuh | Paket dan pcs berbeda tidak dijumlahkan sebagai satu minimum |
| D-13 | Setelah penerimaan pertama, status biasa tidak boleh selesai jika ada sengketa terbuka | Keputusan admin memiliki rekam terpisah, tidak memalsukan klik pengguna |
| D-14 | Penurunan batas paket tidak menghapus produk; pengguna di atas batas tidak dapat menerbitkan tambahan | Produk lama tidak diam-diam hilang karena pengaturan admin berubah |
| D-15 | Dalam demo, SKU yang sama tidak diduplikasi ke toko berbeda dan tidak dipindah penerbitnya setelah transaksi ada | Mencegah ketidakjelasan pemilik rating dan stok bersama |
| D-16 | Tenggat DP berupa durasi bayar sejak konfirmasi, dibatasi jadwal produksi/penyerahan | Penjual dan pembeli melihat tanggal/jam hasil perhitungan; kebutuhan tenggat absolut dapat memakai tipe kontrak berbeda |

Pemulihan nomor hilang, batas usia, daftar barang terlarang, banding, retensi bukti, dan kebijakan pengembalian DP tetap memerlukan keputusan produk sebelum pilot nyata. RFC menyediakan ruang data dan mekanisme kasus; tidak mengarang ketentuan pengembalian uang.

## 4. Arsitektur yang dipilih

```mermaid
flowchart LR
  U[Browser mobile atau desktop] --> V[React SPA di Vercel]
  V --> A[Supabase Auth]
  V --> Q[Data API: read dengan RLS dan RPC]
  V --> E[Edge Functions: OTP, media, billing demo]
  Q --> D[(PostgreSQL: transaksi dan PostGIS)]
  E --> D
  E --> W[OpenWA di host terpisah]
  W --> WA[WhatsApp OTP]
  D --> R[Realtime: data yang boleh dibaca]
  R --> V
  V --> S[Storage privat via izin atau URL sementara]
  E --> S
  C[Supabase Cron] --> D
```

### 4.1 Komponen dan alasan

| Komponen | Pilihan | Alasan |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, React Router | Satu SPA untuk feed, akun, transaksi, dan admin; konfigurasi minimal untuk demo |
| Server state | TanStack Query | Cache, refetch setelah mutasi/reconnect, pagination; cache bukan sumber hak akses |
| Form | React Hook Form + Zod | Validasi input dan pesan field; backend tetap memvalidasi ulang |
| Backend domain | PostgreSQL functions via Supabase RPC | Satu transaksi untuk persetujuan, stok, audit, dan notifikasi |
| External I/O | Supabase Edge Functions | OTP/OpenWA, pemrosesan media, dan adapter billing dummy |
| Auth | Supabase Auth | Email/password dan Google OAuth sesuai PRD |
| Chat live | Supabase Postgres Changes | Volume demo terbatas; pesan disimpan sebelum dikirim ke pelanggan Realtime |
| Geo | PostGIS + data wilayah layanan | Filter jarak dan batas layanan tanpa mesin pencarian terpisah |
| Scheduled work | Supabase Cron | Pengingat, kedaluwarsa status turunan, pembukaan ulasan |
| OTP delivery | rmyndharis/OpenWA via HTTPS | Provider yang dipilih pengguna; bukan @open-wa/wa-automate |
| Pengujian | Vitest, pgTAP atau integration tests SQL, Playwright | Unit angka, otorisasi/race database, dan alur dua browser |

Vercel mendukung deployment Vite; rancangan menggunakan build SPA dan rewrite rute aplikasi ke entry HTML. Rute fungsi backend berada di Supabase, sehingga tidak membutuhkan server Express tambahan di Vercel. Trade-off: SEO dan preview sosial dinamis per listing belum menjadi keluaran demo. Jika dibutuhkan saat publik, evaluasi prerender/SSR secara terpisah. [Dokumentasi Vite di Vercel](https://vercel.com/docs/frameworks/frontend/vite).

Alternatif yang dipertimbangkan:

- **Next.js full-stack:** berguna untuk SSR, tetapi memperluas keputusan framework di fase ketika prioritas utama adalah alur transaksi. Tidak dipilih untuk baseline ini.
- **Backend NestJS tersendiri untuk Barter:** memberi kontrol penuh tetapi menambah deployment dan lapisan API. NestJS internal OpenWA tidak berarti backend Barter harus ikut memakai NestJS.
- **Mutasi CRUD langsung dari browser:** mudah diawali, tetapi tidak memberi batas perintah yang jelas untuk konfirmasi dan reservasi banyak baris. Tidak dipakai untuk perubahan bisnis.

### 4.2 Struktur repository yang direncanakan

```text
src/
  app/                  routing, providers, session lifecycle
  features/
    auth/ profiles/ discovery/ listings/ stores/ plus/
    chat/ barter/ orders/ reports/ reviews/ notifications/ admin/
  components/           komponen bersama yang tidak mengandung otorisasi
  lib/                  clients, money, time, query keys, error mapping
  generated/            tipe database hasil generator
supabase/
  migrations/           schema, grants, RLS, functions, indexes, jobs
  functions/
    otp/ media/ billing-demo/ admin-evidence/
    _shared/            auth validation, adapters, error envelope
  tests/                invariant dan policy tests
tests/e2e/              skenario lintas akun
docs/
  PRD.md
  RFC-001-arsitektur-barter.md
```

Belum ada scaffold yang dibuat. Versi package ditentukan saat implementasi, dipin bersama lockfile, lalu dicatat dalam README. RFC tidak mengklaim versi terbaru yang belum diuji bersama.

## 5. Batas otorisasi dan jalur mutasi

### 5.1 Schemas dan privileges

- `public`: tabel domain yang aman dibaca sesuai RLS, read models, serta RPC wrapper dengan kontrak terbatas.
- `private`: nomor/alamat tepat, OTP, billing provider internals, audit admin, serta fungsi privileged. Schema ini tidak diekspos melalui Data API.
- Semua tabel domain yang diekspos mengaktifkan RLS; grant SELECT diberikan eksplisit sesuai kebutuhan. Tidak ada blanket INSERT/UPDATE/DELETE untuk klien pada tabel bisnis.
- Fungsi baca biasa memakai `SECURITY INVOKER`. Perintah yang harus mengubah beberapa tabel memakai wrapper invoker yang memanggil fungsi `private` dengan kewenangan khusus.
- Fungsi privileged diperlukan karena klien tidak mendapat hak DML langsung. Fungsi dimiliki role NOLOGIN dengan hak minimum pada tabel terkait, memakai `search_path = ''`, nama objek lengkap, dan pemeriksaan actor sendiri. Tidak memakai definer sekadar untuk menutupi error RLS.
- Cabut EXECUTE default dari PUBLIC; grant hanya wrapper dan fungsi internal yang benar-benar diperlukan. Fungsi internal yang callable oleh role pengguna tetap wajib memeriksa `auth.uid()` dan seluruh aturan, walaupun schema tidak diekspos REST.
- Fungsi sistem berbeda dari fungsi pengguna: jangan menganggap `auth.uid() IS NULL` sebagai izin admin. Worker/scheduler/billing/OTP memiliki entry point dan grant tersendiri.

Supabase memisahkan grants dari RLS; RLS tidak menggantikan pembatasan EXECUTE pada fungsi. Rancangan grant ini harus dibuat dalam migration yang sama dengan schema/policy. [Securing your API](https://supabase.com/docs/guides/api/securing-your-api), [Database Functions](https://supabase.com/docs/guides/database/functions).

### 5.2 Pemeriksaan setiap perintah

1. Identitas pengguna berasal dari JWT Supabase yang valid, bukan `actor_id` dari body.
2. Baca status akun, kelengkapan profil, verifikasi nomor, dan kemampuan yang diperlukan dari database.
3. Periksa hubungan actor dengan objek: pemilik listing, peserta transaksi, penerima uang, atau admin kasus.
4. Validasi versi, status, waktu server, data masukan, serta idempotency key.
5. Jalankan perubahan atomik; simpan event dan notifikasi terkait dalam commit yang sama.

Edge Functions memverifikasi token sebelum membuat client privileged. Jika harus memanggil fungsi service-only dengan `actor_id`, nilainya berasal dari hasil verifikasi token; tidak diteruskan dari request. Credential server tidak pernah ada di `VITE_*`. [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth).

Status Plus/admin/verifikasi/sanksi tidak boleh diambil dari `user_metadata` yang dapat diedit pengguna. Untuk tindakan sensitif, cek database terbaru agar token lama tidak mempertahankan hak yang sudah dicabut.

## 6. Model data logis

Nama berikut adalah rancangan schema, bukan SQL migration yang sudah dijalankan. Semua ID bisnis memakai UUID; tabel yang dapat berubah memiliki created_at/updated_at dan revision atau row_version sesuai kebutuhan. Waktu memakai `timestamptz` UTC, ditampilkan di Asia/Jakarta. Nominal menggunakan integer rupiah (`bigint`), dikirim sebagai string desimal pada JSON untuk menghindari presisi JavaScript. Jumlah unit positif dan harga tidak negatif.

### 6.1 Identitas, lokasi, katalog

| Entitas | Kolom/relasi utama | Constraint atau invariant |
| --- | --- | --- |
| `profiles` | `id -> auth.users`, display_name, avatar_asset_id, bio | Satu profil per user; hanya data publik yang aman |
| `private.account_state` | user_id, onboarding_status, account_status | Hanya command/admin yang mengubah status |
| `private.phone_claims` | user_id, phone_e164, verified_at, released_at | Unique nomor dan user untuk klaim belum dilepas; ban tidak otomatis melepas nomor |
| `private.user_locations` | user_id, exact_point, address, area_id | Hanya pemilik dan kasus beralasan lewat endpoint terkontrol |
| `service_areas` | area_id, name, polygon, enabled, source_version | Seed wilayah resmi/terverifikasi; Kepulauan Seribu dikecualikan |
| `stores` | id, owner_id, name, slug, description, operating_hours, status | owner immutable dalam demo; jumlah toko dijaga dengan lock akun |
| `private.store_locations` | store_id, exact_point, address, consent_public_at | Alamat lengkap hanya diproyeksikan jika pemilik mengizinkan |
| `listings` | id, owner_id, store_id nullable, category_id, title, description, condition, defects, negotiable, barter_preferences, category_attributes, lifecycle, version | store_id harus milik owner; pemilik tidak berganti setelah ada transaksi; field/validasi bagian 21 |
| `listing_modes` | listing_id, mode: sale/barter/free | sale+barter boleh; free eksklusif |
| `listing_variants` | id, listing_id, label, unit, price_rupiah, active | Varian harus milik listing pada baris pesanan |
| `listing_discovery` | listing_id, area_id, approximate_point, search_vector, price_min, price_max | Hanya proyeksi tanpa koordinat/alamat privat; tidak bisa ditulis klien |
| `preorder_batches` | id, listing_id, order_closes_at, fulfillment_at, minimum_qty, quota_mode, dp_percent, dp_deadline | Satu batch aktif per listing (D-05); snapshot aturan saat menerima pesanan |
| `inventory_pools` | id, listing_id, batch_id?, variant_id?, capacity, held, consumed, is_exclusive | `held >= 0`, `consumed >= 0`, `held + consumed <= capacity` |
| `media_assets` | id, uploader_id, storage_key, state, mime, hash, size | Key immutable setelah terikat snapshot; ownership dan konteks wajib |

`fulfillment_kind` pada listing adalah ready_stock/preorder/catering; ini berbeda dari `listing_modes`. Listing catering/PO dapat diterbitkan lewat profil pribadi maupun toko. Kombinasi awal yang direkomendasikan: PO/catering memakai sale; barter/free pada barang ready_stock.

Untuk varian kuota bersama, semua baris varian merujuk pool batch yang sama; per-varian memakai satu pool untuk tiap varian. Barang tunggal memakai pool eksklusif kapasitas 1. Donasi terbagi memakai pool non-eksklusif. Catering manual tidak menjanjikan stok otomatis; penjual memastikan kapasitas sebelum mengirim ringkasan.

### 6.2 Percakapan dan transaksi

| Entitas | Kolom/relasi utama | Constraint atau invariant |
| --- | --- | --- |
| `conversations` | id, listing_id, user_low, user_high | Unique listing + pasangan user terurut; kedua user berbeda |
| `conversation_members` | conversation_id, user_id, last_read_seq | Hanya dua peserta; cursor dibaca monoton |
| `messages` | id, conversation_id, sender_id?, seq, client_message_id, type, transaction_id?, body | Unique conversation+seq dan sender+client_message_id; append-only |
| `transactions` | id, conversation_id, kind, party_a, party_b, lifecycle, current_revision, accepted_revision?, row_version | Tepat dua peserta berbeda, sesuai conversation; kind immutable |
| `transaction_revisions` | transaction_id, revision, created_by, reason, terms_snapshot, supersedes_revision | Unique transaksi+revision; immutable |
| `transaction_items` | revision_id, offered_by, listing_id?, source_listing_version?, variant_id?, asset_refs, name, details, qty, price_snapshot | Snapshot immutable; hanya barang milik pihak yang menawarkan |
| `transaction_consents` | transaction_id, revision, user_id, ready_at, approved_at | Unique transaksi+revision+user; approve hanya jika kedua ready versi sama |
| `reservations` | transaction_id, pool_id, is_exclusive, qty, revision, state | Unique transaksi+pool aktif; pool eksklusif hanya satu reservasi aktif global |
| `fulfillments` | transaction_id, status, seller_handed_at?, party_a_received_at?, party_b_received_at? | Hanya peran terkait yang mengonfirmasi |
| `payment_obligations` | transaction_id, revision, kind, payer_id, payee_id, amount, due_at, state | DP/balance/topup/shipping; penerima yang dapat mengakui pembayaran |
| `payment_acknowledgements` | obligation_id, recorded_by, amount, recorded_at, evidence_asset_id? | Pencatatan penerimaan manual, bukan data settlement bank; satu pengakuan per kewajiban pada demo |
| `transaction_events` | transaction_id, seq, actor_id?, type, revision, metadata, created_at | Append-only; tidak mengandung OTP/nomor/alamat yang tidak diperlukan |
| `cancellation_requests` | transaction_id, actor_id, reason, status, decided_by? | Tidak otomatis menghapus pembayaran yang sudah dicatat |

Revisi draft juga disimpan sebagai versi immutable untuk audit. Tombol edit menciptakan revisi baru, bukan UPDATE snapshot lama. Status Siap/Setujui dari versi terdahulu tetap menjadi riwayat, tetapi tidak aktif pada `current_revision`.

Relasi listing/variant/pool diperiksa menggunakan foreign key komposit jika memungkinkan dan validasi command untuk aturan lintas tabel. Barang langsung dalam barter memiliki listing_id NULL dan media milik penawar; tidak dibuatkan listing publik tersembunyi.

`reservations.is_exclusive` disalin dari pool dan dijaga oleh foreign key komposit `(pool_id, is_exclusive)` ke pasangan unik pada inventory_pools. Jenis pool tidak boleh diganti setelah dipakai transaksi. Ini memungkinkan partial unique index lokal pada reservations(pool_id) untuk state aktif dan is_exclusive=true tanpa mencoba memakai join/subquery dalam predicate index. Untuk pool eksklusif capacity=1 dan qty reservasi=1 wajib dipenuhi.

### 6.3 Plus, moderasi, dan pekerjaan sistem

| Entitas | Isi utama |
| --- | --- |
| `plan_settings` | harga, batas toko/listing, rasio promosi; versi konfigurasi |
| `subscriptions` | user_id, paid_through, source, last_billing_order_id; satu baris hak aktif per akun |
| `billing_orders` | buyer_id, amount, currency, method, mode=dummy, status, expires_at, activated_at |
| `promotion_rotation` | owner_id, last_served_at, slot_count; rotasi kesempatan per akun |
| `reviews` | transaction_id, author_id, target_user_id/store_id, rating, comment, published_at |
| `review_replies` | review_id, author_id, body; hanya penerima ulasan yang membalas |
| `reports` | reporter_id, target_type, transaction_id/listing_id/review_id, reason, status, assigned_admin_id |
| `report_evidence` | report_id, message_id/asset_id/event_id, submitted_by, scope_reason |
| `private.report_access_log` | report_id, admin_id, accessed_object, reason, timestamp |
| `report_decisions` | report_id, outcome, rationale, required_actions, deadline, decided_by |
| `sanctions` | user_id, capability, severity, starts_at, ends_at?, reason, report_id? |
| `blocks` | blocker_id, blocked_id, created_at |
| `notifications` | recipient_id, type, target_id, dedupe_key, read_at |
| `private.command_receipts` | actor_id, command, idempotency_key, request_hash, result |
| `private.otp_challenges` | user_id, phone, purpose, digest, expires_at, attempts, delivery_state, consumed_at |
| `private.rate_limit_buckets` | subject hash, purpose, window, count |
| `private.admin_roles` | user_id, role, granted_by, revoked_at |
| `private.system_jobs` | dedupe_key, kind, due_at, attempts, status, last_error |

Entitas tambahan revisi 1.1: categories/category_field_rules, listing_fulfillment_options, catering_terms, plan_settings_versions/settings_audit (bagian 21–22), transaction_amendments/refund_requests/refund_confirmations (bagian 23), dan private.product_events/listing_visibility_periods/user_activity_days/metric_rollups (bagian 24). Entitas tersebut juga tunduk pada grants/RLS dan batas mutasi bagian 5; bukan tabel bebas CRUD untuk browser.

Jangan membuat semua tabel sebagai syarat layar pertama. Migration dibagi menurut alur vertikal pada bagian 18; model lengkap memberi arah konsisten ketika modul bertambah.

### 6.4 Indeks minimum

- GiST pada titik discovery dan polygon area; GIN pada search vector.
- `(lifecycle, created_at DESC, id)` pada listing; `(owner_id, lifecycle)` dan `(store_id, lifecycle)` untuk kuota publikasi.
- `(conversation_id, seq)` pada messages; indeks membership berdasarkan user_id.
- `(party_a, lifecycle, updated_at)` serta `(party_b, lifecycle, updated_at)` pada transaksi.
- Indeks pool dan partial uniqueness untuk reservasi aktif eksklusif.
- `(state, due_at)` pada kewajiban DP; `(status, due_at)` pada jobs.
- Unique `reviews(transaction_id, author_id)` dan `notifications(recipient_id, dedupe_key)`.
- Unique key idempotensi per actor+command+key. Nomor terverifikasi unik dinormalisasi E.164.

## 7. Aturan perubahan status

### 7.1 Status dipisahkan menurut tanggung jawab

`transactions.lifecycle`: negotiating, agreed, completed, cancelled. Flag sengketa tidak mengganti atau menghapus riwayat lifecycle; kasus mempunyai status sendiri dan dapat menahan penyelesaian normal.

`fulfillments.status`: pending, processing, ready_for_pickup, delivering, handed_over. Konfirmasi penerimaan disimpan per pihak, bukan satu boolean bersama.

Status pembayaran diturunkan dari obligations/acknowledgements: not_required, awaiting_dp, payment_review_required, dp_received, unpaid_balance, paid. Tidak ada saldo rekening pengguna di Barter.

### 7.2 Barter

| Perintah | Prasyarat | Efek atomik |
| --- | --- | --- |
| `revise_trade` | Peserta; boleh mengubah penawaran miliknya; batas revisi D-03 | Revisi++, salin paket terbaru, status siap/setuju aktif kosong, event perubahan |
| `mark_trade_ready` | Paket dua pihak dapat ditinjau; paket actor valid; expected_revision sesuai | Catat siap actor pada revisi ini |
| `approve_trade` pertama | Kedua pihak siap pada revisi yang sama | Catat approve actor; menunggu pihak lain |
| `approve_trade` terakhir | Kedua siap dan actor belum approve; semua barang masih tersedia | Lock seluruh pool, reservasi seluruh paket, simpan accepted_revision, lifecycle=agreed |
| `confirm_trade_received` | Actor peserta, lifecycle agreed, tidak ada amendmen/sengketa yang menghalangi | Catat penerimaan hanya untuk actor |
| `acknowledge_topup` | Actor penerima uang, nominal dari kewajiban server | Catat penerimaan uang; tidak boleh dilakukan pembayar |
| `complete_if_eligible` | Kedua penerimaan barang ada; topup jika ada telah diakui; tidak ada hold kasus | lifecycle=completed, ubah held ke consumed, event dan hak ulasan |

`complete_if_eligible` dipanggil internal setelah konfirmasi, bukan tombol bebas yang menerima status dari browser.

```mermaid
stateDiagram-v2
  [*] --> Negotiating
  Negotiating --> Negotiating: revisi mereset kedua persetujuan
  Negotiating --> BothReady: dua pihak Siap pada revisi sama
  BothReady --> Negotiating: penawaran berubah
  BothReady --> OneApproved: persetujuan pertama
  OneApproved --> Negotiating: penawaran berubah
  OneApproved --> Agreed: persetujuan kedua dan reservasi berhasil
  Agreed --> Completed: semua penerimaan terpenuhi tanpa sengketa
  Agreed --> Cancelled: pembatalan yang diizinkan
  Negotiating --> Cancelled: pembatalan beralasan
```

BothReady/OneApproved adalah label UI yang diturunkan dari consent, bukan lifecycle terpisah. Jika reservasi gagal pada persetujuan terakhir, seluruh command di-rollback dan kembalikan `ITEM_UNAVAILABLE`; jangan menyimpan kesepakatan tanpa semua barang. Persetujuan pertama sebelumnya tetap menjadi riwayat tetapi tidak dapat dipakai melompati validasi terbaru.

Revisi terhadap listing sumber sebelum kesepakatan: versi sumber dicatat pada item; final approve mendeteksi versi listing berbeda dan meminta refresh/review. Setelah kesepakatan, snapshot dan media yang disepakati tetap dapat dibaca walaupun listing kemudian disembunyikan.

### 7.3 Jual, gratis, dan PO

| Transisi | Actor | Prasyarat/efek |
| --- | --- | --- |
| Draft ringkasan -> dikirim | Penjual/pemberi | Hitung harga server; validasi data penyerahan lengkap |
| Ringkasan -> agreed | Pembeli/penerima | Versi sesuai, reservasi cukup, toko boleh menerima transaksi baru |
| agreed -> processing | Penjual makanan | DP yang diwajibkan sudah diakui; tanpa DP dapat langsung diproses |
| processing -> ready | Penjual | Pesanan siap sesuai metode; boleh belum lunas sebagaimana PRD |
| processing/ready -> delivering | Penjual | Pengantaran dipilih; jika pelunasan sebelum pengiriman diwajibkan, pembayaran sudah diakui |
| -> handed_over | Penjual/pemberi | Konfirmasi penyerahan sendiri; jika pelunasan sebelum pengambilan diwajibkan, pembayaran sudah diakui |
| -> penerimaan pembeli | Pembeli/penerima | Hanya actor terkait; boleh tiba lebih dulu daripada klik penjual |
| -> completed | Sistem | Penyerahan dan penerimaan ada; semua pembayaran wajib diakui; tidak ada kasus terbuka |

Untuk jual preloved tidak ada kewajiban melewati processing. Untuk gratis total barang nol; jika ongkir disepakati, kewajiban shipping menjadi syarat pembayaran terkait. Untuk catering kapasitas manual, command tidak membuat jaminan persediaan otomatis.

### 7.4 Pembatalan dan revisi setelah pembayaran

- Sebelum ada konfirmasi penerimaan barter, pembatalan biasa yang diizinkan melepaskan reservasi. Jika uang tambahan sudah diakui walau belum ada klik penerimaan barang, arahkan ke kasus pengembalian; jangan menghapus kewajiban atau audit pembayaran.
- PO sebelum processing dapat dibatalkan pembeli dengan alasan. Setelah processing, buat cancellation request untuk keputusan penjual.
- Jika ada DP, pembatalan menyimpan jumlah yang telah diakui dan status kebutuhan penanganan pengembalian. Ketentuan snapshot menjadi acuan; aplikasi tidak otomatis menganggap uang hangus atau sudah dikembalikan.
- Setelah ada penerimaan barang, pembatalan biasa ditolak dengan `DISPUTE_REQUIRED`.
- Ketika ada pembayaran tercatat, perintah edit nominal langsung ditolak `PAID_ORDER_AMENDMENT_REQUIRED`. Rancangan lengkap memakai proposal amendmen pada bagian 23, bukan mengubah tagihan/receipt lama. Penundaan UI amendmen untuk demo tetap usulan D-03 yang perlu keputusan prioritas; jika ditunda, UI menjelaskan jalur chat/admin dan keterbatasan secara eksplisit.

### 7.5 Pesanan dan barter menggantung

Setelah konfirmasi penerimaan pertama, catat `first_received_at`. Reminder menggunakan acuan ini: 24 jam untuk pengingat pihak lain; 72 jam untuk kemampuan meminta bantuan admin. Jika telah selesai/dibatalkan atau sudah ada kasus yang sama, job tidak membuat tindakan ganda. Sengketa dapat dibuka kapan saja sesuai PRD.

## 8. Atomisitas, ketersediaan, dan idempotensi

### 8.1 Strategi reservasi

Semua jalur sale/barter/free/PO memakai pool dan fungsi reservasi yang sama. Tidak boleh ada stok terpisah untuk mode jual dan barter pada listing yang sama.

Setiap mutasi mengikuti urutan lock konsisten: konfigurasi paket bila relevan (shared lock untuk pengguna, exclusive lock untuk perubahan admin), account guards yang diperlukan (urut UUID), transaksi (urut UUID jika lebih dari satu), listing terkait (urut UUID), lalu pool (urut UUID). Daftar participant/owner immutable dapat dibaca sebelum lock; setelah lock selalu validasi ulang. Jangan memperbarui transaksi pesaing saat memegang lock pool; notifikasinya diproses sebagai pekerjaan terpisah agar tidak membentuk siklus lock.

Dalam satu database transaction:

1. Validasi actor, status, versi, dan idempotency key.
2. Lock baris terkait dengan `SELECT ... FOR UPDATE`.
3. Gabungkan jumlah kebutuhan per pool, termasuk beberapa varian yang memakai kuota bersama.
4. Pastikan `capacity - held - consumed >= requested` untuk semua pool.
5. Tulis reservasi dan tambah held; finalisasi kesepakatan serta accepted_revision.
6. Simpan event/notifikasi/receipt. Commit seluruhnya atau rollback seluruhnya.

Saat selesai: held dikurangi dan consumed ditambah. Saat pembatalan sebelum penyerahan: held dikurangi, reservasi released; batch yang sudah ditutup tetap tidak dapat dipesan meski kapasitas matematis kembali. Jangan menghapus histori reservasi.

Untuk barang eksklusif, partial unique index memastikan hanya satu active reservation per pool. Pool kuantitas memakai lock dan constraint counter. Minimum pembelian diverifikasi sebelum reservasi, dalam satuan yang homogen.

PostgreSQL row locks bertahan sampai transaksi selesai dan dapat menimbulkan deadlock jika urutannya berbeda; urutan global dan transaksi singkat diperlukan. Jangan memanggil OpenWA atau layanan jaringan sambil memegang lock database. [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html).

### 8.2 Revisi dengan reservasi lama

Usulan D-03: ketika transaksi belum dibayar/diserahkan membuka revisi, lifecycle tetap agreed dengan amendment_pending. Consent revisi baru kosong; konfirmasi penyerahan diblokir sampai amendmen diputuskan. Reservasi versi lama tetap menahan barang.

Saat kedua pihak menerima revisi baru, lock gabungan pool lama dan baru, hitung delta, lalu ganti reservasi secara atomik. Jika tambahan stok tidak cukup, versi lama tetap direservasi; jangan melepaskannya lebih dulu. Pembatalan yang diizinkan melepas seluruh hold; penolakan amendmen dapat mengembalikan versi sebelumnya hanya lewat persetujuan eksplisit pihak terkait, bukan otomatis setelah timer.

Untuk demo, UI amendmen setelah agreed dapat ditunda dan diganti arah ke pembatalan beralasan sebelum penyerahan. Penundaan harus tercatat sebagai keterbatasan D-03, bukan mengubah aturan bahwa perubahan penawaran memerlukan persetujuan ulang.

### 8.3 Request berulang dan status basi

- Perintah sensitif membawa `idempotency_key` UUID, `expected_revision` untuk isi penawaran, dan `expected_row_version` jika status yang ditampilkan harus cocok.
- Receipt unik per actor+command+key menyimpan hash request dan hasil commit.
- Key sama dengan payload sama mengembalikan hasil sebelumnya; key sama dengan payload berbeda ditolak.
- Receipt sukses dan perubahan bisnis berada dalam satu commit. Kegagalan validasi tidak menyimpan sukses palsu. Request yang kalah perlombaan key menunggu commit pertama lalu membaca hasil.
- Untuk siap/setuju simultan, versi penawaran menjadi guard utama; perubahan status pihak lain tidak boleh memaksa pengguna mengedit ulang barang. UI dapat refetch dan mengulangi command yang semantik/idempotensinya sama.
- Error `REVISION_CONFLICT` meminta tampilan terbaru dan peninjauan ulang; frontend tidak mengulang persetujuan pada revisi baru secara otomatis.
- Retry timeout/5xx menggunakan key yang sama. Deadlock/serialization failure dapat dicoba ulang terbatas oleh caller; tidak memakai key baru untuk menghindari aksi rangkap.

## 9. Perhitungan uang, kuota, dan tenggat

Semua kalkulasi final berada di database dari item snapshot/harga tervalidasi. Browser hanya menampilkan perkiraan dan hasil server.

```text
subtotal = sum(quantity_i × unit_price_i)
total = subtotal + shipping
dp_due = ceil(total × dp_percent / 100)   // nol jika tanpa DP
balance_due = total - dp_due
```

Jika DP 100%, balance nol dan tidak perlu klik pelunasan kedua. Tidak ada diskon/pajak tambahan yang diada-adakan. Batas nominal/quantity harus divalidasi agar hasil tidak overflow. Untuk uang tambahan barter, hanya satu kewajiban dari satu pihak ke pihak lainnya dan nominal positif.

Usulan tenggat DP (D-16): listing menyimpan durasi bayar (jam); server membentuk deadline saat pesanan dikonfirmasi dan membatasi tidak melewati deadline produksi/penyerahan yang disetujui. Jika penjual membutuhkan tanggal absolut, field kontrak terpisah dengan jenis deadline; jangan menafsirkan satu angka sebagai dua konsep. Ringkasan sebelum konfirmasi menampilkan durasi dan batas akhir; setelah konfirmasi menampilkan deadline final. Jika waktu produksi sudah tidak memungkinkan pembayaran, konfirmasi ditolak dan jadwal perlu diperbarui.

Deadline lewat menghasilkan payment_review_required, tidak membebaskan kuota. Penjual boleh mengakui pembayaran yang masuk sebelum/sesudah tenggat dengan catatan waktu; perubahan keputusan tidak mengklaim waktu transfer bank yang tidak diketahui. Timer memakai jam server. Job tertunda tidak boleh membuat transaksi baru lolos setelah batas batch berakhir; perintah tetap memeriksa waktu saat dijalankan.

## 10. Kontrak API yang diusulkan

Semua nama di tabel adalah **kontrak rancangan**, belum endpoint yang tersedia. Satu command mengembalikan objek terbaru dan version, bukan hanya pesan sukses. Error menggunakan kode stabil untuk UI berbahasa Indonesia.

### 10.1 Bentuk request/response

```json
{
  "transaction_id": "<uuid>",
  "expected_revision": 3,
  "idempotency_key": "<uuid>"
}
```

```json
{
  "ok": false,
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Penawaran berubah. Tinjau kembali sebelum menyetujui.",
    "current_revision": 4
  },
  "request_id": "<uuid>"
}
```

HTTP mapping: 400 input invalid, 401 belum login, 403 tidak berhak, 404 tidak ditemukan/tidak boleh diketahui, 409 konflik state/stok/versi, 429 batas percobaan, 503 dependency tidak tersedia. Respons tidak mengungkap nomor/email pemilik akun lain.

### 10.2 Edge endpoints

| Endpoint logis | Fungsi | Batas akses |
| --- | --- | --- |
| `POST /functions/v1/otp/request` | Challenge dan kirim OTP | JWT valid; rate limit akun+nomor+IP |
| `POST /functions/v1/otp/verify` | Verifikasi OTP dan klaim nomor atomik | JWT valid; challenge harus milik actor |
| `POST /functions/v1/media/prepare` | Izin upload staging | Pemilik draft atau peserta konteks valid |
| `POST /functions/v1/media/finalize` | Validasi gambar, hapus metadata, buat derivative | File staging milik actor, batas ukuran |
| `POST /functions/v1/billing-demo/create` | Tagihan dummy Plus | User valid, mode server demo |
| `POST /functions/v1/billing-demo/simulate` | Success/fail/expired | Pemilik invoice, allowlist demo, mode server |
| `GET /functions/v1/admin-evidence/:report_id` | Baca paket bukti dengan audit akses | Admin aktif yang diizinkan pada kasus |

Supabase dapat memakai satu function per kelompok dengan router internal; URL path akhir mengikuti router yang dipilih. Tidak perlu satu deployment function per action domain.

### 10.3 RPC domain

| Kelompok | Commands/read functions | Efek/guard penting |
| --- | --- | --- |
| Profil | `complete_profile`, `update_profile`, `set_location` | Nomor/status verified bukan field editable |
| Discovery | `search_listings`, `get_listing`, `search_stores` | Projection publik, radius/filter/visibility dihitung server |
| Listing | `save_listing_draft`, `publish_listing`, `revise_listing`, `archive_listing` | Owner, limit 20/100, snapshot, status reservasi |
| Toko | `create_store`, `update_store`, `set_store_address_visibility` | Plus, limit 3, owner, consent alamat |
| Chat | `open_conversation`, `send_message`, `mark_conversation_read` | Pasangan/listing, block policy, sender dari auth |
| Barter | `create_trade`, `revise_trade`, `mark_trade_ready`, `approve_trade` | Version dan consent kedua pihak |
| Pesanan | `create_order_quote`, `revise_order_quote`, `confirm_order_quote` | Minimum, kuota, harga, jadwal, eligibility toko |
| Pembayaran | `acknowledge_payment` | Obligation valid, actor payee, jumlah dari server |
| Penyerahan | `mark_processing`, `mark_ready`, `mark_delivering`, `confirm_handover`, `confirm_received` | Role, DP/pelunasan, tidak ada blocking dispute |
| Pembatalan | `cancel_transaction`, `request_cancellation`, `respond_cancellation` | Aturan jenis transaksi dan bukti penerimaan |
| Laporan | `create_report`, `attach_report_evidence`, `request_admin_help` | Reporter terkait objek, konteks bukti, dedupe |
| Admin | `assign_report`, `record_report_decision`, `apply_sanction`, `hide_listing` | Role DB aktif, alasan wajib, audit |
| Review | `submit_review`, `reply_review`, `report_review` | Transaksi selesai, target dari server, satu review |
| Notifikasi | `list_notifications`, `mark_notification_read` | Recipient saja |
| Pengaturan admin | `get_plan_settings`, `update_plan_limits`, `list_settings_history` | Admin capability settings; hanya batas yang diizinkan, versi, alasan, audit; bagian 22 |
| Amendmen | `propose_amendment`, `accept_amendment`, `reject_amendment`, `withdraw_amendment` | Snapshot baru, counterpart consent, delta kuota dan saldo; bagian 23 |
| Pengembalian | `propose_refund`, `accept_refund`, `record_refund_sent`, `confirm_refund_received` | Kesepakatan/judgment, uang langsung antar pihak, receipt terpisah; bagian 23 |
| Analytics | `record_activity_day`, `get_product_metrics` | Aktivitas sendiri yang diminimalkan; hasil agregat hanya admin; bagian 24 |
| Batch dan kapasitas | `create_preorder_batch`, `close_preorder_batch`, `update_inventory_capacity` | Owner, jadwal, pool per batch/varian, kapasitas tidak di bawah held+consumed; bagian 21.3 |
| Blokir | `block_user`, `unblock_user` | Actor hanya mengubah daftar blokir sendiri; tidak menutup jalur kasus/transaksi aktif sesuai D-08 |

Jangan sediakan endpoint umum `set_transaction_status`, `set_verified`, atau `set_plus_active` untuk browser. Completion dan perubahan entitlement adalah hasil perintah yang tervalidasi.

## 11. OTP WhatsApp dan siklus akun

### 11.1 Integrasi OpenWA

Provider yang digunakan: [rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA). README menyediakan REST pengiriman teks dengan API key dan sesi, serta deployment Docker. Backend Barter memanggil `POST /api/sessions/{sessionId}/messages/send-text` dengan tujuan yang dinormalisasi; endpoint/version aktual diverifikasi kembali terhadap image yang dipin saat implementasi. [Contoh API OpenWA](https://github.com/rmyndharis/OpenWA#-api-examples).

Gunakan key operator yang dibatasi ke sesi OTP, bukan admin key. Sesi dihubungkan operator melalui dashboard OpenWA; QR sesi tidak diberikan kepada pengguna Barter. Provider memiliki autentikasi dan scope key tersendiri. [OpenWA authentication](https://docs.open-wa.org/guides/authentication/).

Adapter internal hanya memerlukan `sendOtp(phone, code, challengeId)` dan mengembalikan delivery reference/status; perubahan provider tidak mengubah identitas akun Supabase atau aturan verifikasi.

### 11.2 Penyimpanan dan validasi OTP

1. Edge memvalidasi JWT, normalisasi nomor +62, purpose register/change_phone, dan batas frekuensi.
2. Backend membuat kode acak kriptografis dan challenge terikat user+nomor+purpose.
3. Simpan HMAC kode dengan server pepper, challenge ID dan konteks; bukan plaintext atau hash enam digit tanpa secret. Pepper hanya pada server.
4. Commit challenge lebih dulu, kemudian panggil OpenWA dengan timeout terbatas; tidak menahan lock database selama jaringan berjalan.
5. Catat delivered/failed/unknown sesuai respons. Tidak mengklaim pesan sudah dibaca atau diterima hanya karena API menerima request.
6. Saat verifikasi, lock challenge dan klaim nomor. Cek expired/consumed/attempts, cocokkan digest secara aman, lalu konsumsi challenge dan klaim nomor dalam transaksi yang sama.
7. Percobaan gagal harus meningkatkan attempts dan **tetap commit**; jangan melempar rollback yang membatalkan counter.
8. Unique constraint nomor menyelesaikan perlombaan dua akun yang memverifikasi nomor sama. Pengguna kedua menerima respons aman tanpa identitas akun pertama.

Kirim ulang membuat challenge baru dan membatalkan challenge lama. Timeout pengiriman tidak memicu retry tak terbatas; pengguna meminta ulang setelah cooldown. Kode tidak dimasukkan ke log, analytics, error tracing, notifikasi publik, maupun events.

OpenWA mendokumentasikan kemungkinan pengiriman pertama tidak sampai walau API sukses. Ketika gateway tidak tersedia, UI mempertahankan onboarding pending, menawarkan koreksi nomor/kirim ulang, dan akun tetap boleh melakukan baca sesuai kebijakan pengunjung. Tidak ada bypass verifikasi otomatis ke email karena email tidak membuktikan nomor. [Catatan delivery OpenWA](https://github.com/rmyndharis/OpenWA#known-platform-behaviour-not-bugs).

### 11.3 Demo, recovery, dan session

- Demo end-to-end OTP memerlukan host OpenWA aktif dan nomor khusus. Jika belum tersedia, gunakan akun uji yang diprovisikan secara eksplisit di proyek demo; tampilkan bahwa integrasi OTP belum diuji, bukan menampilkan verifikasi WhatsApp palsu.
- Login Google/email dan verifikasi nomor adalah dua proses berbeda. Tidak perlu menjadikan nomor login Supabase jika pengguna tetap memakai Google/email.
- Pergantian nomor memerlukan sesi yang baru diverifikasi/reauth dan OTP nomor baru. Nomor lama dilepas hanya setelah transaksi penggantian berhasil; ban tidak melepas nomor otomatis.
- Pemulihan nomor yang tidak lagi dikuasai adalah pekerjaan admin terkontrol yang kebijakannya belum final. OTP nomor daur ulang tidak cukup untuk mengambil alih akun lama.
- Password reset memakai alur Supabase email; konfirmasi email dan redirect URL harus dikonfigurasi untuk domain demo.
- Link identity Google/email harus mengikuti identitas terverifikasi dari Supabase, bukan pencocokan nomor atau nama di aplikasi.

## 12. Geo, pencarian, dan privasi

### 12.1 Titik asli dan titik discovery

Koordinat tepat hanya disimpan di schema private. Untuk discovery, backend membuat titik perwakilan grid tetap sekitar 1 km dalam proyeksi metrik yang sesuai; ukuran ini usulan D-02. Public point tidak diacak ulang setiap request karena banyak sampel dapat dirata-ratakan.

Filter radius, urutan terdekat, dan jarak yang dikembalikan memakai titik discovery yang sama. Ini mengurangi kebocoran lokasi tepat melalui pengulangan query dengan pusat/radius berbeda. Trade-off: hasil 5 km bersifat perkiraan, terutama di batas radius; UI menyebut jarak perkiraan. Penentuan apakah listing berada di area layanan tetap menggunakan titik asli server-side.

Store yang memilih alamat publik dapat memakai titik usaha publik; pengubahan consent mengubah proyeksi selanjutnya. Cache detail lokasi harus diinvalidasi, walaupun informasi yang pernah dilihat pengguna tidak dapat ditarik kembali.

PostGIS menyediakan tipe geography dan spatial index; gunakan `ST_DWithin` dalam meter serta GiST, bukan memindai semua lat/lng di frontend. [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis).

### 12.2 Penemuan dan promosi

- Backend mengecek area layanan, status listing, moderasi, ketersediaan, dan Plus toko secara langsung saat query.
- Keyword awal memakai full-text search konfigurasi simple; optimasi fuzzy dapat ditambahkan setelah ukuran data diketahui. Tidak membutuhkan Elasticsearch.
- Cursor pagination mengikat filter, sort, titik area pencarian, dan ID terakhir; perubahan filter memulai cursor baru.
- Baseline page berisi 20 kartu: 18 organik + maksimum 2 promosi pada posisi 10 dan 20. Jika tidak ada kandidat, isi organik; jangan membuat kartu kosong.
- Kandidat promosi harus cocok filter, tersedia, dan berasal dari akun Plus aktif. Pilih akun dengan giliran terlama, baru pilih produk dari toko-tokonya; tidak memberi bobot lebih karena punya tiga toko.
- Jangan menampilkan produk yang sama dua kali pada halaman yang sama; hapus duplikat kandidat organik/promosi. Giliran dihitung sebagai slot dialokasikan, bukan klaim bahwa pengguna benar-benar melihat iklan.
- Untuk demo, rotasi hanya mutasi metadata promosi melalui entry point terkontrol dengan rate limit. Permintaan feed retry memakai page token agar tidak menghabiskan giliran dua kali. Penghitungan impression publik/anti-fraud skala besar bukan scope demo.
- Usulan D-04: PO dengan sebagian kuota tersisa tetap tersedia/dapat dipromosikan; yang dikecualikan adalah kuota habis, bukan seluruh listing hanya karena satu unit direservasi.

Data wilayah dan peta harus memakai sumber berizin dengan atribusi yang sesuai. Penyedia tiles/geocoder belum dipilih; demo dapat memakai pilihan area dan browser geolocation terlebih dahulu. Jangan menganggap browser geolocation membuktikan domisili atau keberadaan fisik.

## 13. Storage, chat, dan notifikasi

### 13.1 Media dan snapshot

- Gunakan bucket privat untuk staging, gambar katalog, lampiran chat, dan bukti.
- Upload mendapat object key acak yang terikat actor/konteks. Backend memeriksa MIME sebenarnya, ukuran, jumlah, dan kepemilikan.
- Server men-decode dan men-encode ulang gambar untuk menghapus EXIF/GPS; kompresi klien saja tidak memenuhi aturan privasi. Library pemrosesan perlu divalidasi pada limit Edge Functions saat implementasi.
- Media yang belum selesai diproses tidak boleh dipublikasikan atau menjadi bukti snapshot final.
- Published derivatives dapat dibaca melalui signed URL singkat setelah pengecekan visibilitas; lampiran chat hanya untuk peserta, bukti hanya dalam kasus yang diizinkan.
- Gambar pada snapshot tidak di-overwrite. Mengganti foto membuat objek baru; objek yang dirujuk transaksi/laporan tidak dihapus oleh penghapusan listing.
- Hak baru langsung berhenti setelah revocation, tetapi URL yang sudah diterbitkan dapat bertahan sampai TTL. Baseline TTL 60 detik untuk bukti/chat dan 5 menit untuk katalog adalah usulan teknis yang harus terlihat dalam model ancaman.
- Jangan memakai path yang mengandung nomor HP atau alamat. Cleanup staging tidak terpakai dijadwalkan; retensi data sengketa memerlukan kebijakan final.

Supabase Storage menggunakan kebijakan akses atas objects; signed URL dan policy dipakai menurut tujuan media, bukan bucket publik untuk semua file. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

### 13.2 Chat dan konteks bukti

- `send_message` memeriksa membership dan block/sanction policy, mengunci counter conversation untuk seq monoton, serta menyimpan pesan dalam commit sebelum delivery. Perintah domain yang menulis pesan sistem mengikuti urutan lock yang sama; alternatifnya membuat pekerjaan pesan sistem setelah commit agar tidak membalik urutan lock transaksi.
- `client_message_id` dari klien mencegah duplikasi saat retry.
- Pesan umum memiliki transaction_id NULL; saat membahas kesepakatan tertentu, composer menampilkan konteks transaksi dan menyimpan tag tersebut. Kartu sistem selalu bertag transaksi.
- Read cursor per anggota menyatakan pesan yang telah dibaca; pengguna tidak dapat menandai pihak lain sudah membaca. Unread dihitung dari seq dan sender.
- Realtime hanya untuk tabel/row yang lolos SELECT policy. Reconnect melakukan fetch pesan setelah cursor terakhir dan refetch transaksi; event Realtime bukan satu-satunya sumber perubahan.
- Admin tidak menjadi anggota semua conversation. Bukti kasus dibaca melalui endpoint audited sesuai D-09, bukan langganan Realtime seluruh chat.

Postgres Changes memerlukan konfigurasi publication dan akses baca sesuai RLS. Pilihan ini cocok untuk volume demo; scaling nanti dapat dievaluasi tanpa mengubah penyimpanan pesan. [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

### 13.3 Pekerjaan terjadwal dan notifikasi

Perubahan domain dan notifikasi langsung ditulis dalam transaksi database yang sama. Peristiwa yang membutuhkan tindak lanjut tertunda membuat `system_jobs` dengan dedupe key; tidak membutuhkan broker terpisah untuk demo.

Cron menjalankan batch pendek setiap menit: claim job yang jatuh tempo, periksa ulang state, buat notifikasi idempotent, lalu tandai selesai. Worker paralel memakai skip-locked/lease; kegagalan diberi retry terbatas dengan backoff dan error tercatat. Tidak mengubah timestamp bisnis untuk mempercepat demo.

Jobs: pengingat DP, payment review required, pengingat penerimaan 24 jam, akses bantuan 72 jam, pengingat Plus, publikasi ulasan barter setelah 14 hari, dan cleanup staging. Tombol bantuan dan visibilitas Plus juga mengecek waktu pada request, sehingga correctness tidak bergantung pada Cron tepat waktu.

Supabase Cron dapat menjalankan SQL/database functions dan mencatat hasil job; gunakan job kecil, bukan loop panjang dalam request pengguna. [Supabase Cron](https://supabase.com/docs/guides/cron).

## 14. Plus dummy dan toko kedaluwarsa

### 14.1 Entitlement

`is_plus_active(user) = paid_through > server_now AND tidak ada sanksi yang meniadakan kemampuan terkait`. Hak toko dibaca server-side setiap publish/accept agreement/query publik, bukan dari boolean yang disimpan klien.

Membuat toko keempat atau listing di atas batas harus gagal walaupun dua request berjalan bersamaan: lock guard akun/toko sebelum count dan insert. Draft/arsip/selesai tidak dihitung; reserved dihitung. Menurunkan batas memakai D-14.

Toko yang Plus-nya habis menjadi tidak visible secara efektif tanpa harus menunggu update massal status semua listing. Status terbit asli dipertahankan; ketika langganan aktif lagi, listing dapat kembali terlihat jika tidak diarsipkan, dimoderasi, habis, atau melewati batas PO.

### 14.2 Simulasi pembayaran

- Server membuat invoice Rp20.000 IDR dari versi konfigurasi harga yang berlaku, method=qris/virtual_account, mode=dummy, pending. Nominal dan versi disalin ke invoice; endpoint perubahan batas admin tidak dapat mengganti harga. UI menampilkan QR/VA ilustrasi yang tidak dapat dipakai untuk transfer dan tulisan simulasi.
- Success hanya melalui function demo dengan token pengguna, invoice miliknya, allowlist user demo, serta konfigurasi server `BILLING_MODE=dummy` dan project environment non-live.
- Invoice pending -> paid/failed/expired hanya sekali. Callback ulang paid mengembalikan hasil yang sama, tanpa memperpanjang dua kali.
- Aktivasi invoice dan penambahan paid_through berada dalam satu transaksi, lock baris subscription.
- Dua invoice berbeda yang valid boleh menambah dua periode secara serial. Nilai invoice berasal dari server, bukan body nominal.
- Periode baru memakai `max(server_now, paid_through)` ditambah satu bulan kalender lokal dengan clamp akhir bulan (D-06).
- Jangan membuat endpoint dummy tersedia pada lingkungan live hanya karena tombolnya disembunyikan. Saat provider nyata ditambahkan, konfirmasi berasal dari webhook provider tervalidasi, bukan browser.

Semua konfirmasi pembayaran barang/DP/topup tetap manual dan terpisah dari invoice Plus. Tidak ada penggunaan invoice Plus untuk menampung transaksi antar pengguna.

## 15. Moderasi, reputasi, dan akses data

### 15.1 Matriks akses minimum

| Data/aksi | Pengunjung | Pemilik/peserta | Pengguna lain | Admin |
| --- | --- | --- | --- | --- |
| Listing/toko visible | Baca projection | Baca, edit lewat command sesuai state | Baca projection | Moderasi beralasan |
| Nomor dan alamat privat | Tidak | Data sendiri; alamat transaksi yang dibagikan | Tidak | Hanya lewat kebutuhan kasus yang dicatat |
| Chat umum | Tidak | Dua peserta | Tidak | Hanya pesan yang dilampirkan untuk laporan |
| Snapshot transaksi | Tidak | Dua peserta, termasuk setelah toko hilang dari publik | Tidak | Kasus terkait saja |
| Pengakuan pembayaran | Tidak | Hanya payee dapat mencatat | Tidak | Dapat mencatat keputusan kasus, bukan menyamar sebagai payee |
| OTP digest/provider secret | Tidak | Tidak | Tidak | Tidak lewat panel admin; service internal saja |
| Ulasan belum terbit | Tidak | Penulis saja | Tidak, termasuk penerima ulasan | Akses laporan spesifik jika diperlukan |
| Sanksi dan hak Plus | Tidak bisa ubah | Tidak bisa ubah langsung | Tidak | Command sesuai role; billing service untuk Plus |

RLS diterapkan untuk read paths termasuk request langsung, bukan hanya query yang dibuat UI. Proyeksi yang merupakan view harus memakai security_invoker atau aksesnya dicabut dan disajikan lewat fungsi dengan field allowlist. Tidak ada auto SELECT semua kolom.

### 15.2 Siklus kasus

Usulan state kasus: open -> reviewing -> awaiting_information -> decided -> awaiting_followup -> closed; transisi tidak harus melewati awaiting_information jika bukti cukup. Keputusan mempunyai outcome seperti no_action, return_required, cancel_transaction, admin_complete, restrict_account. Setiap keputusan menyebut rationale dan pihak/tindakan yang diperlukan.

Admin boleh memutuskan hasil platform, tetapi tidak menulis `received_at` atau `paid_at` seolah pengguna telah mengonfirmasi. Penyelesaian oleh admin menggunakan event `admin_resolution` dan actor admin yang terlihat pada riwayat.

Sengketa setelah transaksi Selesai membuat case hold, bukan mengurangi consumed/menambah stok otomatis. Listing baru tersedia lagi hanya setelah ada keputusan dan konfirmasi kondisi/pengembalian yang memadai. Pengembalian uang/DP manual dicatat sebagai tindak lanjut; tidak diklaim otomatis selesai.

Laporan untuk transaksi yang sama digabung ke kasus aktif atau ditautkan, agar dua admin tidak mengeluarkan keputusan bertentangan. Lock report/transaction pada keputusan final. Admin yang merupakan peserta transaksi tidak boleh menangani kasusnya sendiri.

Ban/restriction memblokir capability sesuai tabel kebijakan, bukan menghapus profil. Akses penyelesaian kasus sendiri tetap tersedia sesuai D-08. Penerapan sanksi mencabut kegiatan baru segera lewat pengecekan database, termasuk ketika token auth lama masih valid.

### 15.3 Rating

- Backend menentukan target profil atau store dari snapshot penerbit transaksi, bukan pilihan author.
- Rating 1–5, satu ulasan per author/transaksi. Hanya pihak yang berhak menurut jenis transaksi.
- Untuk barter, publish kedua ulasan dalam satu transaksi saat lengkap; jika belum lengkap, publish setelah completed_at + 14 hari.
- RLS/read API menyembunyikan ulasan tertunda dari pihak lawan, termasuk agregat/rating yang dapat membocorkan nilainya.
- Rating toko/profil dihitung hanya dari review published yang tidak disembunyikan lewat moderasi. Jangan menggabungkan tiga toko ke satu rating toko.
- Pemilik dapat membalas sekali pada demo; edit/review pascasengketa menunggu kebijakan produk. Riwayat moderasi tetap tersimpan.

## 16. UI dan perilaku kegagalan

Rute yang diusulkan: `/`, `/search`, `/listings/:id`, `/listings/new`, `/stores`, `/stores/:slug`, `/my/listings`, `/my/stores`, `/chat/:id`, `/transactions/:id`, `/plus`, `/notifications`, `/profile`, `/onboarding`, `/admin/reports`, `/admin/reports/:id`.

- Navigasi mobile utama: Beranda, Cari, Pasang, Pesan, Akun. Menu toko berada di akun; admin memakai rute terpisah.
- Halaman transaksi menampilkan kedua pihak, isi versi aktif, status, kewajiban uang, serta tombol yang diizinkan. Label tidak hanya mengandalkan warna.
- Tombol Siap dan Setujui tidak optimistic: tunggu hasil server. Saat versi berubah, tampilkan perubahan dan batalkan kesiapan visual.
- Konfirmasi DP/pelunasan/topup menyebut siapa membayar, berapa nominal, dan bahwa penjual sudah memeriksa uang masuk.
- Empty state memberi arah tindakan; error field tetap mempertahankan input pengguna.
- Offline: tampilkan status tidak tersambung; jangan mengantre persetujuan/pembayaran secara diam-diam. Draft lokal boleh disimpan dengan penanda belum terkirim.
- Aksesibilitas: keyboard/focus, label form, error terkait field, layar 360 px tanpa overflow, dan tombol yang mudah disentuh.
- Cache query dipisah per user dan dibersihkan saat logout; data akun sebelumnya tidak boleh terlihat setelah pergantian akun.

## 17. Verifikasi dan kriteria penerimaan

Ini rencana pengujian implementasi, bukan hasil tes aplikasi yang sudah dijalankan.

| ID | Skenario | Hasil wajib | Lapisan |
| --- | --- | --- | --- |
| T-01 | OTP salah, expired, reuse, dan verifikasi nomor sama oleh dua akun | Tidak ada klaim salah; attempts tetap bertambah; paling banyak satu pemilik nomor | Integration |
| T-02 | B mengubah foto/uang setelah A siap/setuju | Kedua consent revisi baru kosong; approve revisi lama gagal | SQL + E2E |
| T-03 | Dua transaksi final approve listing yang sama bersamaan | Hanya satu agreed; lainnya konflik tanpa reservasi parsial | SQL concurrency |
| T-04 | Paket barter berisi 3 barang, satu tidak tersedia | Tidak ada barang lain ikut tertahan dari command gagal | SQL |
| T-05 | Dua pembeli merebut kuota terakhir | Tidak oversell; shared variant digabung sebelum pengecekan | SQL concurrency |
| T-06 | PO Rp100.000 DP 50%; DP 100%; nominal ganjil | Rp50.000/Rp50.000; nol saldo jika 100%; pembulatan sesuai aturan | Unit + SQL |
| T-07 | DP lewat tenggat dan gateway/cron terlambat | Review required, kuota tidak dilepas, penjual dapat memeriksa | Integration |
| T-08 | Pembeli mencoba mengakui DP sendiri atau langsung set status completed | Ditolak di API/RPC langsung, bukan hanya tombol hilang | Authorization |
| T-09 | Plus dummy callback diulang dan dua invoice berbeda | Invoice sama tidak menambah dua kali; invoice berbeda diserialisasi | SQL |
| T-10 | Plus lewat masa aktif saat Cron mati | Toko tidak publik; peserta masih bisa menyelesaikan transaksi lama | Integration |
| T-11 | Dua request membuat toko ke-3/ke-4 atau listing terakhir | Batas maksimum tidak terlampaui | SQL concurrency |
| T-12 | Query user lain, Realtime, foto, atau direct REST | Nomor, lokasi tepat, chat, snapshot privat tidak bocor | RLS + storage |
| T-13 | Satu chat berisi dua transaksi, hanya satu dilaporkan | Admin hanya menerima konteks yang diizinkan; akses tercatat | Authorization |
| T-14 | Salah satu menerima lalu pihak lain membatalkan | DISPUTE_REQUIRED; reservasi tidak dilepas | SQL + E2E |
| T-15 | Topup belum diakui tetapi kedua barang diterima | Belum completed | SQL |
| T-16 | Reminder worker berjalan ulang/reconnect chat | Tidak ada notifikasi/pesan rangkap; pesan tertinggal di-fetch | Integration |
| T-17 | Review barter baru satu, lalu kedua, atau 14 hari lewat | Review tersembunyi sampai syarat publish; rating tidak bocor lebih awal | SQL |
| T-18 | Jalur dummy dipanggil pada konfigurasi live | Ditolak server, walau request dibuat manual | Integration |
| T-19 | Pembatalan transaksi yang sudah selesai lalu laporan pengembalian | Stock consumed tidak tiba-tiba tersedia | SQL |
| T-20 | Logout A lalu login B pada browser sama | Tidak ada cache chat/transaksi A tersisa | E2E |
| T-21 | Semua jalur Google/email, field profil, OTP, ganti nomor, reset password | Jalur login benar; Google tidak diminta password baru; aksi terkunci sampai profil/nomor lengkap; label hanya menyatakan verifikasi nomor | Integration + E2E |
| T-22 | Pencarian 5 km, lintas kota, area di luar layanan, publikasi toko berbeda lokasi | Default benar; radius bisa diperluas; Kepulauan Seribu di luar area; hasil pakai lokasi penerbit; batas D-02 dinyatakan | Geo + E2E |
| T-23 | Alamat privat, toko opt-in/opt-out, lokasi pertemuan dalam chat | Tidak membuka alamat otomatis; setiap toko independen; projection/cache/URL mengikuti batas privasi | Authorization + E2E |
| T-24 | Listing sale, barter, sale+barter, free; negosiasi dan kategori | Mode/field valid; label gratis tanpa harga barang; preferensi barter ada; source enum/field khusus tervalidasi | Unit + SQL + E2E |
| T-25 | Draft/publish/edit/archive, identitas personal/toko, akun gratis berjualan usaha | Tanpa approval admin untuk validasi lengkap; listing milik pihak lain tidak berubah; gratis boleh catering/PO; lifecycle konsisten | Integration + E2E |
| T-26 | Produk berkuota dan barang tunggal sedang reserved; listing dihapus dari publik | Barang eksklusif tidak diedit; snapshot/media tetap ada; perubahan katalog kuota mengikuti D-04 | SQL + E2E |
| T-27 | Nama produk/toko, kategori, harga, mode, sort dan kartu PO | Query mempertahankan semua filter; pilihan sort bekerja; batas/jadwal PO tampil; tab toko membuka katalog | Integration + E2E |
| T-28 | Rotasi promosi 20 kartu, dua pemilik dengan 1 vs 3 toko, retry halaman | Maksimum 2 promosi berlabel; giliran per akun; tidak duplikat; semua filter/eligibility berlaku; retry tidak mengambil giliran baru | Integration |
| T-29 | Multi-item trade, barang langsung, edit nama/detail/foto/jumlah/topup, sumber berubah | Tiap pihak minimal satu barang; hanya owner memasukkan barang; barang langsung tidak muncul publik; seluruh perubahan menuntut review versi baru | SQL + E2E |
| T-30 | A siap lebih dulu, B siap lalu A/B setuju, penerimaan urutan berbeda | Persetujuan akhir memerlukan kedua Siap; UI menunggu sesuai actor; kedua penerimaan wajib; pesan pemeriksaan fisik tampil | E2E |
| T-31 | Beberapa negosiasi pada listing sama; kesepakatan lalu pembatalan | Negosiasi boleh; final reservasi menolak pesaing dan memberi notifikasi; pembatalan sah melepaskan hold | Integration |
| T-32 | Jual beli lengkap termasuk harga akhir dan metode penyerahan | Quote dikonfirmasi pembeli; reservasi lalu penyerahan/pembayaran/penerimaan; completed hanya jika semua syarat terpenuhi | E2E |
| T-33 | Gratis: memilih penerima bukan yang pertama, stok dibagi, ongkir | Pemilik memilih; jumlah tidak melebihi kapasitas; barang Rp0; ongkir terpisah; penyerahan kedua pihak | SQL + E2E |
| T-34 | Catering dan PO, jadwal, lead time, area layanan, kapasitas manual | Field/snapshot lengkap; catering tidak mengaku stok dijamin otomatis; PO tertutup tidak menerima order | Unit + E2E |
| T-35 | Minimum campur varian, shared/per-variant, pembatalan batch terbuka/tertutup | Total satuan homogen memenuhi minimum; hold termasuk menunggu DP; PO penuh diberi label; pembatalan tidak membuka batch tertutup | SQL + E2E |
| T-36 | PO tanpa DP, tenggat terlihat, lewat waktu, pelunasan sebelum/saat serah terima | Tanpa DP melewati tahap; DP menghalangi processing; ready boleh belum lunas; delivery/pickup mematuhi tenggat pelunasan | Integration + E2E |
| T-37 | Pembatalan PO sebelum/sesudah processing dan setelah uang diterima | Alasan wajib; setelah processing perlu keputusan penjual; receipt lama tidak hilang; kebijakan refund tidak dikarang | SQL + E2E |
| T-38 | Pickup/meetup/delivery, ongkir belum diketahui, perubahan jadwal/ongkir | Konfirmasi ditolak jika ongkir belum final; perubahan membutuhkan review ulang; alamat hanya peserta | Integration + E2E |
| T-39 | Percakapan per pasangan/listing, order ulang, foto dan kartu sistem | Conversation tidak tercampur listing; order ulang pakai ID transaksi terpisah; tidak ada edit/unsend; evidence tetap tersedia | Integration + E2E |
| T-40 | Blokir/report, read cursor, belum dibaca, reconnect | Read cursor hanya actor dan monoton; send ulang tidak duplikat; perilaku transaksi aktif sesuai D-08 | Authorization + E2E |
| T-41 | Seluruh jenis notifikasi PRD, tautan tujuan, reminder berulang | Recipient dan konteks tepat; reminder sekali per tahap; tidak mengirim WhatsApp aktivitas/push | Integration |
| T-42 | Laporan sebelum/setelah selesai, moderator berkepentingan, keputusan dan sanksi | Laporan bisa dibuat tanpa menunggu 72 jam; admin peserta ditolak; alasan/audit/tenggat tercatat; akses kasus dibatasi | Authorization + E2E |
| T-43 | Timer penerimaan 24/72 jam, Cron terlambat, kasus sudah terbuka | Pengingat/bantuan sesuai jam server, tidak auto-complete, tidak membuka kasus ganda | Integration |
| T-44 | Rating setiap jenis, profil vs tiga toko, komentar opsional, balasan/report | Actor/target tepat, skor 1–5, satu review, pemilik tidak bisa menghapus; draft tidak bocor pada agregat | SQL + E2E |
| T-45 | Batas versi awal: fee, billing, staf, native/push, kurir, DP barter, edit chat, polisi | Tidak ada fungsi escrow/transfer/polisi otomatis atau fee barang; dummy jelas; fitur di luar scope tidak diklaim tersedia | Review kontrak + E2E |
| T-46 | Mobile 360 px, keyboard, offline dan error | Tidak overflow; form terlabel; aksi sensitif tidak diam-diam diantre; input koreksi terjaga | E2E |
| T-47 | Detail tiga toko, jam/lokasi berbeda, memilih penerbit, Plus habis/aktif lagi | Profil/katalog independen; hanya owner; expired tidak publik/promosi, transaksi lama tetap dapat diakses | Integration + E2E |
| T-48 | Admin mengubah batas, request concurrent, payload harga/role ilegal, limit diturunkan | CAS/version+alasan wajib; audit; non-admin ditolak; tidak hapus data; hasil count konsisten dengan versi paket | SQL concurrency + E2E |
| T-49 | Usulan amendmen setelah DP: harga/jumlah naik/turun, persetujuan stale, persediaan kurang | Snapshot/receipt lama utuh; hanya counterpart menyetujui; delta atomik; refund/tambahan terhitung; failure mempertahankan kontrak lama | SQL + E2E (bergantung D-03) |
| T-50 | Refund yang disepakati: penerima belum konfirmasi, duplicate, salah actor, dana melebihi paid | Tidak mengklaim uang diterima dari klik pengirim; idempotent; nominal terikat keputusan; refund tidak melebihi net receipt | SQL + E2E (kebijakan terbuka) |
| T-51 | Listing sempat aktif singkat, reserved, expired Plus, pindah area, timezone mingguan | Hitung periode sesuai definisi, distinct listing sekali per area, edge waktu half-open benar, demo tidak tercampur live | Analytics integration |
| T-52 | Completion event berulang, reopened report, admin resolution | Transaksi dihitung sekali; jenis/penyelesaian admin terpisah; tidak menganggap penerimaan sepihak selesai | Analytics integration |
| T-53 | Burst pesan, pesan sistem, percakapan berbeda, belum dibalas | Pasangan response deterministik; bot/sistem dikecualikan; unanswered dilaporkan terpisah, bukan nilai nol | Analytics unit |
| T-54 | Cohort D7/W1/Plus belum matang, denominator nol, pengguna admin/demo | Nilai belum matang/null jelas; cohort dan denominator benar; aktivitas/minimalisasi data sesuai kontrak | Analytics integration |
| T-55 | Build/config/seeds, seluruh alur rencana demo dan pencatatan bukti | Tidak ada credential nyata di repo; stack/lingkungan terpisah; tiap requirement punya status dan bukti tes aktual sebelum klaim selesai | Review + build + E2E |

Definition of Done per alur: UI tersambung database; happy path dan penolakan peran/state diuji; error dapat dipahami; snapshot/audit tersedia; tidak ada data privat di log; keterbatasan demo ditulis. Alur tidak dinyatakan selesai jika hanya tombol/tampilan yang berubah lokal.

## 18. Urutan implementasi dan batas waktu

Rencana berikut mengalokasikan 27 jam, **bukan estimasi terverifikasi bahwa seluruh scope pasti muat**. Checkpoint menentukan apakah perlu mengurangi keluaran demo; pengurangan tidak boleh dilakukan diam-diam. Waktu menunggu credential/host tidak disulap menjadi fitur selesai.

| Hari | Alokasi 3 jam | Keluaran / checkpoint |
| --- | --- | --- |
| 1 | 0,5 setup; 1 auth/schema; 1 profil+OTP adapter; 0,5 verifikasi | Repo/app berjalan; keputusan readiness OpenWA; akun uji nyata |
| 2 | 1 listing/storage; 1 feed+lokasi; 1 validasi akses | Posting dan pencarian area; gambar tanpa metadata privat |
| 3 | 1 chat; 1 model transaksi/snapshot; 1 integration | Dua akun melihat percakapan dan revisi yang sama |
| 4 | 1,5 consent+reservasi barter; 0,5 topup/penerimaan; 1 race tests | **Checkpoint A:** barter end-to-end dan penolakan persetujuan lama |
| 5 | 1 quote+varian; 1 kuota+DP; 1 pelunasan/tes | **Checkpoint B:** PO tanpa oversell, DP manual |
| 6 | 1 toko/limit; 1 Plus dummy; 1 expiry+promosi/tes | **Checkpoint C:** maksimal tiga toko, aktivasi idempotent |
| 7 | 1,5 reuse jual/gratis; 0,5 notifikasi; 1 perbaikan integrasi | Alur berbagi komponen terhubung; keterlambatan diukur |
| 8 | 1 laporan/admin minimum; 0,5 review; 1,5 akses/bukti/tes | Kasus terkontrol; tidak ada akses seluruh chat admin |
| 9 | 1,5 E2E+mobile; 1 perbaikan; 0,5 naskah/demo | Build demo dan daftar fitur berjalan/belum berjalan |

Jika checkpoint A/B/C belum lolos, prioritaskan perbaikan auth, data, persetujuan, dan stok. Kandidat penundaan yang harus dilaporkan: peringkat relevansi lanjutan, rotasi promosi yang canggih, UI laporan lengkap, amendmen setelah pembayaran, dan konfigurasi admin yang luas. Jangan mengganti OTP, penyelesaian transaksi, atau RLS dengan bypass agar demo terlihat selesai.

### 18.1 Migration dan seed

Urutan migration logis:

1. Schemas/grants/roles, profiles, phone/account state, area dan katalog.
2. Media, discovery, stores, plan/subscription primitives.
3. Conversation/messages, transaksi/revisi/item/consent.
4. Pool/reservation, obligations/acknowledgements, commands/barter/order.
5. Reports/sanctions/reviews/notifications/jobs dan policies.
6. Index tuning, seed konfigurasi/area, job schedule.

Semua perubahan dipertahankan sebagai migration versioned dan diverifikasi pada database uji kosong. Gunakan workflow CLI Supabase yang tersedia pada versi terpasang; jangan menjalankan migrasi pada proyek pengguna yang belum ditargetkan secara eksplisit.

Seed demo: dua akun warga, satu pemilik tiga toko, satu admin, listing preloved, paket barter, PO varian, donasi terbagi, akun Plus aktif/expired, serta kasus contoh. Gunakan alamat/nomor/data sintetis; credential seed tidak masuk repository publik. Demo OTP menggunakan nomor yang benar-benar diizinkan pemiliknya, bukan pengiriman ke nomor contoh acak.

### 18.2 Lingkungan dan operasi

- Local: Vite dan Supabase lokal bila Docker tersedia; alternatif proyek Supabase demo terpisah. Pilihan alternatif harus dicatat.
- Preview/demo: Vercel preview + Supabase demo + OpenWA HTTPS pada host terpisah. OpenWA memerlukan sesi/data persisten; lokasi host dan biaya belum dipilih.
- Live: belum diluncurkan. Tidak berbagi tabel/credential dengan demo dan tidak mengaktifkan dummy billing.
- Konfigurasi publik: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Server secrets: Supabase secret/service credential jika diperlukan, `OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID`, `OTP_PEPPER`, mode lingkungan/billing dan allowlist demo.
- Auth redirect URL dikunci ke domain yang dikenal; email provider/SMTP dikonfigurasi sebelum menguji signup/reset di luar lokal.
- Error log menggunakan request_id, command, transaction_id, code, durasi; redaksi kode OTP, message body, alamat tepat, nomor, dan tokens.
- Pantau kesehatan sesi OpenWA, kegagalan kirim OTP, conflict/oversell rejection, job gagal, serta error RLS. Jangan menyimpan seluruh payload chat demi observabilitas.
- Rollback aplikasi memakai build terakhir yang sesuai schema; migration cenderung additive. Jangan menghapus tabel atau snapshot untuk rollback demo. Perubahan destruktif perlu rencana migrasi terpisah.

## 19. Kesesuaian dengan PRD

Tabel berikut hanya navigasi kelompok. Audit requirement individual ada pada [lampiran matriks cakupan](./RFC-001-matriks-cakupan.md), termasuk sumber baris PRD, data/API, acceptance test, status rancangan, dan prioritas demo. Tidak ada angka kelulusan implementasi yang diturunkan dari jumlah baris yang berhasil dipetakan.

| Bagian PRD | Bagian RFC | Catatan |
| --- | --- | --- |
| 3–5: wilayah, akun, privasi | 3, 5, 11, 12 | Detail alamat/OTP/recovery tetap ditandai keputusan |
| 6: Plus dan toko | 6, 14 | Rp20.000, 3 toko, limit 20/100, dummy dan expiry |
| 7–8: listing/feed/promosi | 6, 12, 13 | Kategori/jenis dipisah; kuota parsial D-04 |
| 9: barter | 7–8 | Dua siap+dua setuju, multi-item, topup, snapshot |
| 10: jual/gratis | 7–9 | Satu model reservasi/penyerahan |
| 11–12: PO/DP/pengantaran | 7–9 | Konfirmasi manual, kuota, tenggat, ongkir |
| 13: chat/notifikasi | 13 | Realtime persisted, WhatsApp OTP saja |
| 14–15: sengketa/reputasi | 15 | Case-scoped access, review bertahap, admin audit |
| 16–18: stack/demo/metrics | 4, 17–18, 24–25 | Definisi metrik dan data di bagian 24; hasil implementasi/tes belum tersedia |

## 20. Catatan verifikasi dokumentasi dan langkah berikutnya

Dokumentasi Supabase, Vercel, PostgreSQL, dan proyek OpenWA ditinjau saat penyusunan; tautan ditempatkan dekat keputusan terkait. Changelog Supabase yang relevan:

- Extension version pinning telah berubah; migration tidak mengasumsikan `CREATE EXTENSION ... VERSION` memilih versi arbitrer. Gunakan default extension yang tersedia pada proyek dan catat versi terpasang. [Changelog extension version](https://supabase.com/changelog/extension-version-pinning-ignored).
- Schema `realtime` tidak boleh dimodifikasi untuk tabel aplikasi. Gunakan tabel aplikasi/publication yang didukung; jangan menambah objek aplikasi di schema internal tersebut. [Changelog Realtime schema](https://supabase.com/changelog/realtime-schema-locked-down-against-modification).

RFC ini memberi kontrak rancangan untuk mulai menurunkan pekerjaan, tetapi belum membuktikan kompatibilitas library, performa, delivery WhatsApp, atau kebenaran SQL yang belum ditulis. Revisi 1.1 menambahkan detail bagian 21–25 dan lampiran matriks untuk menutup celah audit cakupan. D-01–D-16 dan register pertanyaan pada lampiran tetap perlu keputusan sesuai dampaknya; PRD tetap sumber keputusan produk.

## 21. Kontrak field listing, toko, dan katalog

Bagian ini melengkapi model logis 6.1 dan perintah 10.3. Nama/struktur field adalah keputusan rancangan teknis; batas panjang, enum kategori final, dan field tambahan kendaraan berikut merupakan rekomendasi untuk ditinjau, bukan kewajiban produk baru yang diam-diam ditambahkan.

### 21.1 Field bersama dan aturan per mode

| Field | Tipe / validasi rancangan | Penggunaan |
| --- | --- | --- |
| `title`, `description` | String tertrim; usulan 3–120 dan 10–5.000 karakter | Wajib saat publish, draft boleh belum lengkap |
| `category_id` | ID kategori aktif dari tabel categories | Nilai bebas di luar registry ditolak |
| `condition`, `defects` | Enum kondisi dan penjelasan kekurangan | Wajib menjelaskan kondisi preloved; defects boleh menyatakan tidak ada kekurangan yang diketahui |
| `asset_ids` | Array asset milik penjual, state processed | Foto aktual, urutan cover, batas D-11; file snapshot tidak dihapus |
| `negotiable` | Boolean, berlaku bila mode sale ada | Label Bisa ditawar/Harga tetap; negosiasi tidak mengganti harga listing otomatis |
| `barter_preferences` | `{open_to_offers: boolean, wanted_description?: string}` | Jika tidak terbuka, barang yang diinginkan wajib dijelaskan; selalu ditampilkan pada detail barter |
| `modes` | Set sale, barter, free tervalidasi | free eksklusif; sale+barter memakai pool yang sama |
| `base_price_rupiah` atau harga varian | Integer/string rupiah tervalidasi server | Wajib untuk sale; barter murni tidak memerlukan harga; free = 0 |
| `store_id` | UUID/null | Owner sama; null adalah listing pribadi, termasuk dagangan usaha gratis |
| `location_id` | Referensi lokasi milik actor/toko | Tidak menerima arbitrary koordinat user lain; projection ikut penerbit |
| `category_attributes` | JSON tervalidasi menurut category+schema_version | Menolak field tak dikenal dan tipe yang tidak sesuai |
| `version` | Integer naik server | Publish/edit/quote merekam versi dan schema field yang dipakai |

`negotiable=false` berarti UI tidak menawarkan aksi Tawar harga; chat tetap tersedia untuk bertanya. Harga akhir quote hanya berubah atas kesepakatan para pihak; kebijakan apakah penjual tetap boleh memberi diskon manual ditandai Q-31 pada matriks. Jangan menganggap flag ini memberikan wewenang platform memaksakan harga di luar aplikasi.

Proyeksi search menyertakan mode, negotiable, preferensi barter ringkas, range harga, stok tersedia, dan jadwal PO yang publik. Field sensitif seperti nomor dokumen kendaraan tidak menjadi bagian search vector.

### 21.2 Kategori dan field khusus

`categories(id, parent_id, slug, name, active)` dan `category_field_rules(category_id, schema_version, allowed_fields, required_fields)` menjadi registry berversi. Seed usulan: makanan (catering/PO), pakaian, furnitur/peralatan rumah, kendaraan, hasil kebun, dan lainnya. Daftar final serta field wajib masih Q-07; admin tidak bisa menjalankan schema JSON/SQL arbitrary dari UI.

Untuk kendaraan, usulan field `brand`, `model`, `year`, `mileage_km?`, `document_availability[]`, dan catatan kondisi. Kelengkapan dokumen berupa pernyataan tersedia/tidak tersedia/belum diperiksa, bukan unggahan identitas/nomor dokumen wajib. Untuk pakaian: size/brand opsional; untuk furnitur: dimensions/material opsional. Foto dan deskripsi tetap dapat dipakai sebelum fitur filter atribut khusus diimplementasikan.

Perintah `save_listing_draft` menerima field yang belum lengkap; `publish_listing` mengembalikan daftar error per field. `revise_listing` memvalidasi ulang seluruh mode/varian serta snapshot yang terpengaruh. Schema version lama disimpan pada quote agar perubahan registry tidak menafsirkan ulang kesepakatan lama.

### 21.3 Varian, catering, PO, dan penyerahan

- Varian minimal mempunyai label unik dalam listing, satuan, harga, dan status aktif. Harga tidak dibaca kembali dari katalog setelah quote diterima.
- `catering_terms(listing_id, minimum_qty?, unit, lead_time_hours, service_area_ids, availability_notes)` menyimpan informasi untuk ditampilkan. Tanggal acara, kapasitas yang disepakati, dan waktu penyerahan disalin ke quote; penjual tetap memeriksa kapasitas manual.
- `listing_fulfillment_options(listing_id, method, enabled, service_area_ids?)` menyimpan pickup/meetup/delivery. Ongkir aktual dan alamat hanya ada pada terms_snapshot transaksi yang privat.
- PO batch menyimpan penutupan, jadwal tersedia, minimum, kuota mode, DP, dan ketentuan pelunasan/pembatalan. `create_preorder_batch`, `close_preorder_batch`, `update_inventory_capacity` hanya owner; kapasitas tidak bisa dikurangi di bawah held+consumed.
- Usulan D-05 membatasi satu batch terbuka, bukan satu batch yang belum seluruh pesanannya selesai. Batch tertutup dapat tetap punya pesanan berjalan; batch baru mempunyai pool berbeda dan tidak memakai saldo kapasitas batch lama.
- Metadata toko lengkap berada pada stores dan tabel lokasi/opsi terkait: nama, logo, deskripsi, kategori usaha, jam per hari dan pengecualian, lokasi, pilihan penyerahan. Semua divalidasi server; jam operasional informatif, bukan scheduler penerimaan pesanan otomatis.

### 21.4 Arsip dan penghapusan

`archive_listing` menyembunyikan dari publik. Untuk daftar dengan reservasi aktif, UI menolak perubahan detail barang tunggal sesuai PRD dan mengarahkan ke penyelesaian/pembatalan. `delete_listing` bila ditambahkan merupakan tombstone (deleted_at), bukan cascade ke transaksi, foto snapshot, atau laporan. Listing berkuota memakai D-04; perbedaan kebijakan ditampilkan dalam matriks sebagai bersyarat sampai disetujui.

## 22. Pengaturan batas oleh admin

PRD 6.1 mengizinkan perubahan batas listing/produk. Kontrak berikut membatasi kewenangan itu secara eksplisit; kemampuan mengubah harga, metode pembayaran, atau status Plus secara sembarang tidak diberikan oleh endpoint yang sama.

### 22.1 Data dan API

- `plan_settings` mempunyai current_version dan batas aktif; `plan_settings_versions` menyimpan salinan immutable plus effective_at, actor, reason. Nilai baseline: 20 listing pribadi, 100 produk/toko, 3 toko Plus, Rp20.000/bulan.
- `get_plan_settings()` menghasilkan batas efektif untuk user dan proyeksi admin yang sesuai role; tidak memuat credential atau billing internals.
- `update_plan_limits({expected_version, personal_active_limit, store_product_active_limit, reason, idempotency_key})` hanya admin dengan capability `manage_plan_limits`. Maksimum toko 3 dan harga tetap read-only sampai ada keputusan produk lain.
- Usulan validasi teknis: integer positif dengan batas operasional yang ditetapkan server; tidak memakai nol sebagai instruksi menghapus semua listing. Tolak field ekstra seperti price, role, user_id, plus_active.
- Transaksi admin mengunci konfigurasi, memeriksa versi, menyimpan versi berikut dan audit before/after, lalu commit. Stale edit -> `SETTINGS_VERSION_CONFLICT`. Pengulangan key tidak membuat versi baru.
- `list_settings_history(cursor)` hanya admin berhak; riwayat tidak dapat diedit/dihapus melalui panel.

### 22.2 UI, efek, dan pengujian

Rute `/admin/settings/limits` menampilkan nilai sekarang, jumlah pemilik yang akan di atas batas baru, input nilai baru, alasan wajib, dan konfirmasi ringkasan before/after. Perhitungan dampak preview bukan jaminan state saat commit; server menghitung ulang jika perlu.

Pengguna yang di atas batas baru tetap menyimpan listing lama sesuai usulan D-14; publikasi tambahan ditolak dengan jumlah aktif dan batas efektif. Draft/arsip/selesai tidak dihitung, reserved dihitung. Naiknya limit langsung membuka kemampuan publikasi berikutnya tanpa mengubah produk lama.

Perintah publish memegang shared lock konfigurasi sebelum lock akun/toko; perubahan admin menggunakan exclusive lock yang sama. Ini menentukan versi paket yang berlaku secara konsisten untuk transaksi yang berlomba, sesuai urutan bagian 8.1. Notifikasi perubahan limit kepada pemilik terdampak dapat dijalankan job idempotent; katalog mereka tidak dihapus otomatis.

T-48 wajib mencakup akses non-admin, payload ilegal, versi basi, dua admin bersamaan, publish bersamaan, alasan kosong, history immutable, retry, serta penurunan limit di bawah jumlah aktif. Ini belum merupakan hasil pengujian.

## 23. Rancangan amendmen pesanan dan pengembalian dana

Bagian ini menutup celah rancangan yang sebelumnya hanya disebut sebagai pekerjaan lanjutan. Kebijakan hak refund/DP tetap keputusan produk terbuka; dukungan UI dalam demo masih usulan prioritas. Tidak ada perpindahan uang yang dilakukan platform.

### 23.1 Proposal amendmen

`transaction_amendments(id, transaction_id, base_revision, proposed_revision, proposer_id, status, expires_at?, created_at, accepted_by?, accepted_at?)` menyimpan proposal berstatus proposed/accepted/rejected/withdrawn. Hanya satu proposal aktif per transaksi; proposal mencakup barang/varian/jumlah, harga, ongkir, DP, waktu, cara penyerahan, dan alasan perubahan.

- `propose_amendment` boleh dimulai peserta yang diizinkan menurut jenis transaksi; untuk pesanan, penjual menyusun rincian baru, pembeli menerima/menolak. Untuk barter, tetap berlaku dua Siap dan dua Setujui pada revisi baru.
- Kontrak yang sudah diterima tidak ditimpa saat proposal dikirim. UI menampilkan versi berjalan dan perbandingan perubahan. Penyelesaian/penyerahan dibekukan selama proposal aktif sesuai rekomendasi D-03 agar barang tidak berpindah pada dua kontrak berbeda.
- `accept_amendment` mewajibkan penerima proposal, expected_revision, dan idempotency_key. Harga diambil dari proposal tervalidasi, bukan dihitung ulang dari listing saat klik.
- Lock transaksi, semua pool lama+baru, serta obligations. Validasi delta stok, lalu ganti accepted_revision, reservasi, dan kewajiban pembayaran dalam satu commit. Salinan lama/receipt tetap immutable.
- Barang/kuota yang akan dikurangi tetap ditahan sampai proposal diterima. Tambahan kuota belum dijamin sebelum acceptance; jika habis, seluruh penerimaan amendmen gagal dan kontrak/reservasi sebelumnya utuh.
- `reject_amendment` oleh penerima dan `withdraw_amendment` oleh pengusul membatalkan proposal saja; kontrak lama tetap berlaku, hold amendmen dilepas. Tidak otomatis membatalkan transaksi lama atau menganggap persetujuan terhadap isi baru.
- Jika sudah ada penerimaan barang atau sengketa terbuka, gunakan kasus admin; jangan membuka editor yang bisa mengubah bukti barang yang sudah diserahkan.

### 23.2 Menghitung saldo setelah perubahan

Setiap payment_acknowledgement lama tetap terikat nominal/penerima/waktu aslinya. Tambahkan alokasi non-duplikatif pada tingkat transaksi, bukan menyalin pengakuan pembayaran lama ke setiap revisi seolah ada uang baru.

```text
gross_received = total pengakuan penerimaan pembayaran kepada penjual
refund_received = total pengembalian yang dikonfirmasi pembeli telah diterima
net_received = gross_received - refund_received
new_total = subtotal_revisi_baru + ongkir_revisi_baru
amount_still_due = max(0, new_total - net_received)
excess_to_return = max(0, net_received - new_total)
additional_dp_due = max(0, dp_due_revisi_baru - net_received)
```

Nilai di atas dihitung untuk pembayaran order yang sama dan pasangan payer/payee yang sama, tidak mencampur topup barter atau Plus. Tampilan tidak boleh menjumlahkan kewajiban lama yang sudah superseded dengan kewajiban baru. `payment_obligations` memerlukan effective/superseded state dan allocation references agar received tidak dihitung dua kali.

Contoh: pesanan Rp100.000 dengan DP diterima Rp50.000 berubah menjadi Rp120.000 dengan DP 50%; tambahan DP Rp10.000, total masih harus dibayar Rp70.000. Jika total baru Rp40.000, selisih Rp10.000 menjadi pengembalian yang perlu disepakati/dilakukan, bukan saldo digital Barter. Jika selisih pengembalian belum dikonfirmasi, settlement masih pending dan completion normal ditahan.

Processing yang belum dimulai tetap terhalang bila tambahan DP belum diterima. Untuk order yang sudah processing, perubahan jadwal kelanjutan dan pembayaran harus terlihat pada proposal; jangan mengubahnya kembali menjadi pesanan baru atau menghapus jejak pekerjaan sebelumnya. Batas kebijakan menerima amendmen setelah processing tetap Q-12.

### 23.3 Refund dan keputusan kasus

`refund_requests` menyimpan transaction_id, basis (amendment/cancellation/admin_decision), amount, payer_id (pengembali), recipient_id, reason, policy_snapshot_ref, status. Nominal harus berasal dari persetujuan kedua pihak atau keputusan admin yang tercatat. Platform tidak menyimpulkan persentase hangus/refund dari teks bebas.

Alur rancangan:

1. `propose_refund` menyimpan alasan dan nominal; pembeli/penjual menyepakati melalui `accept_refund`, atau admin membuat keputusan berdasarkan kasus. Tidak boleh melebihi pembayaran bersih yang diakui untuk transaksi tersebut.
2. Pengembali melakukan transfer langsung dan menekan `record_refund_sent`, boleh melampirkan bukti. Status menjadi sent_unconfirmed; ini belum berarti pembeli telah menerima uang.
3. Penerima menekan `confirm_refund_received`; append `refund_confirmations`, lalu hitung saldo bersih dan status tindak lanjut secara atomik/idempotent.
4. Jika penerima membantah, membuka laporan/menambah bukti; admin menyelesaikan melalui event keputusan, bukan memalsukan konfirmasi penerima.

Refund, pembatalan, dan ketersediaan barang adalah dimensi terpisah. PO yang dibatalkan dapat mengembalikan kuota sesuai aturan batch meskipun urusan refund masih terbuka; barang yang sudah diserahkan tidak otomatis tersedia kembali. Order completed yang dilaporkan tetap memiliki completed_at historis dan status sengketa/pengembalian terpisah.

Policy DP per PO perlu format terstruktur atau kategori yang disetujui produk sebelum otomatisasi entitlement refund; untuk sekarang simpan teks ketentuan dalam snapshot dan nominal keputusan eksplisit. Tidak ada peraturan baru bahwa DP selalu hangus atau selalu kembali.

## 24. Definisi metrik dan pengumpulan data

Semua definisi operasional berikut adalah rekomendasi teknis untuk metrik PRD 18. Target angka bisnis tetap terbuka. Data demo tidak boleh dipresentasikan sebagai kinerja produk nyata.

### 24.1 Event dan penyimpanan

- `private.product_events(event_id, event_type, entity_id, actor_id?, occurred_at, source, environment, is_test, attributes_allowlist)` menyimpan event bisnis yang ditulis backend pada commit asli. Unique sumber+entity+event/version menghilangkan retry ganda.
- Event: account_onboarding_completed, listing_published/visibility_changed, transaction_completed, subscription_activated, store_visibility_changed. Message sent/received/read tetap memakai tabel pesan; analytics tidak menyalin body atau lampiran.
- `listing_visibility_periods(listing_id, area_id, valid_from, valid_to?, eligible)` menyimpan interval eligibility publik. Transisi publish/reserve/archive/moderasi/area/Plus/batch menutup atau membuka interval dengan waktu efektif, bukan waktu job terlambat dijalankan.
- `private.user_activity_days(user_id, local_date, first_activity_at, last_activity_at, environment, is_test)` menyimpan aktivitas bermakna harian. Aksi database seperti kirim pesan, posting, atau transaksi mencatatnya; kunjungan halaman foreground user login memakai `record_activity_day`, maksimal sekali per hari untuk hitung retensi.
- Activity dari browser hanyalah sinyal analytics yang dapat dipalsukan, bukan dasar reputasi/Plus/hak akses. Background refresh, bot, proses Cron, login admin untuk moderasi, dan refresh token tidak dihitung sebagai aktivitas warga.
- `private.metric_rollups(metric, period_start, period_end, area_id?, kind?, numerator, denominator?, value?, definition_version, computed_at, environment)` berisi hasil agregat yang dapat dihitung ulang. Raw source tidak dihapus oleh penghitungan ulang.
- `get_product_metrics({period, area_id?, kind?, definition_version})` memerlukan capability admin analytics, menghasilkan agregat; tidak membuka user_id, nomor, alamat atau isi chat. Sebelum pilot publik, tentukan retensi raw events dan akses ekspor.

### 24.2 Rumus dan jendela waktu

Semua interval menggunakan [mulai, akhir), zona pelaporan Asia/Jakarta; occurred_at disimpan UTC. Minggu pelaporan Senin 00.00 sampai Senin berikutnya. Filter environment/is_test dilakukan sebelum agregasi. Denominator nol menghasilkan null/not_applicable, bukan 0% yang menyesatkan.

| Metrik PRD | Definisi operasional rancangan | Sumber / pengecualian |
| --- | --- | --- |
| Listing aktif mingguan per area | COUNT DISTINCT listing_id dengan interval publik eligible yang beririsan minggu | Listing yang aktif hanya satu jam tetap dihitung; draft/arsip/moderasi/expired toko tidak eligible. Barang eksklusif reserved tidak eligible untuk discovery; istilah aktif ini berbeda dari hitungan batas akun yang tetap menghitung reserved. Label dashboard menjelaskan definisi |
| Transaksi berhasil selesai | COUNT DISTINCT transaction_id dengan first completed_at dalam interval, dikelompokkan kind | Dua kali event completion dihitung sekali. Completion admin ditandai terpisah; transaksi yang kemudian bersengketa ditampilkan sebagai completed_with_dispute, tidak menyembunyikan kasus |
| Rata-rata waktu respons chat | Mean durasi dari pesan pertama dalam burst masuk yang belum dibalas hingga balasan manusia pertama dari pihak lain, dalam conversation yang sama | Pesan beruntun A sebelum B membalas adalah satu burst; switch arah berikutnya membentuk burst baru. System cards tidak menjadi balasan. Unanswered dilaporkan sebagai jumlah/persentase terpisah, bukan durasi nol. Tambahkan median untuk konteks |
| Retensi D7 | Pengguna cohort onboarding hari D yang aktif pada tanggal lokal D+7 dibagi total pengguna cohort yang jendelanya sudah matang | Aktivitas pada hari lain tidak memenuhi D7. Cohort kurang dari 8 tanggal kalender sejak D diberi provisional, bukan dianggap churn |
| Retensi W1 | Pengguna cohort onboarding yang aktif setidaknya sekali pada tanggal D+7 sampai D+13 dibagi cohort matang | Jendela harus berakhir sebelum pelaporan final; definisi disimpan bersama hasil |
| Toko aktif | COUNT DISTINCT store_id visible dengan minimal satu produk eligible selama interval | Satu pemilik dapat dihitung sampai tiga toko; toko kosong atau Plus expired tidak dihitung |
| Konversi Plus 7 hari | Pengguna cohort onboarding yang memperoleh aktivasi Plus pertama dalam [onboarding_at, onboarding_at+7 hari) dibagi cohort matang | Invoice pending/failed/expired bukan aktivasi; perpanjangan tidak menambah numerator. Dummy dihitung hanya dalam dashboard berlabel demo; live mengecualikan semua dummy |

Untuk reply metric, tetapkan kohort berdasarkan waktu pesan pembuka burst dalam periode, lalu evaluasi reply sampai `as_of`. Contoh A jam 10.00, A jam 10.02, B jam 10.05 menghasilkan 300 detik, bukan dua sampel 300/180. Response_rate dihitung dari burst yang sudah dibalas dibagi seluruh burst hingga as_of; angka periode yang masih menerima balasan diberi provisional. Latensi diukur di server, bukan timestamp perangkat.

Interval listing menggunakan lokasi area pada interval tersebut. Listing yang berpindah area dapat dihitung sekali pada masing-masing area yang benar-benar dilayani, tetapi agregat Jabodetabek menghitung distinct global, bukan menjumlahkan area. Expiry yang diketahui (Plus/batch) memotong valid_to saat waktunya tercapai walau job terlambat; tidak menghitung waktu eligibility palsu.

### 24.3 Prioritas dan penerimaan

Pengumpulan event dasar melekat pada mutasi bisnis sejak implementasi modulnya. Dashboard analitik lengkap merupakan kandidat P2 untuk setelah demo, tanpa menghilangkan metrik dari rancangan produk. Demo memakai fixture untuk T-51–T-54: interval singkat, batas minggu, event rangkap, response burst, cohort matang/belum matang, denominator kosong, dan pemisahan dummy/live. Tidak ada klaim metrik sudah tersedia sebelum query/tes diimplementasikan.

## 25. Aturan cakupan, prioritas, dan perubahan dokumen

Lampiran matriks memberi ID stabil R-xxx untuk butir PRD, Q-xx untuk keputusan terbuka, serta pemetaan ke desain/data/API dan tes. Acuan sumber adalah PRD v1.3; nomor baris membantu audit, bukan identitas requirement yang boleh dinomori ulang ketika file berubah. Dokumen PRD tetap tidak diubah oleh pelengkapan RFC ini.

Status rancangan:

- **Dirancang:** ada perilaku teknis dan acceptance test yang dapat diturunkan ke implementasi.
- **Bersyarat:** ada rekomendasi teknis tetapi sebagian perilaku bergantung keputusan D/Q; tidak boleh dianggap final.
- **Konteks:** tujuan/roadmap/stack atau target bisnis; dibuktikan lewat kumpulan alur dan dokumen, bukan satu endpoint.
- **Eksklusi:** secara eksplisit di luar versi awal; diuji sebagai batas scope jika relevan.

Prioritas rekomendasi: **P0** fondasi dan skenario inti demo; **P1** alur pelengkap versi awal setelah P0 stabil; **P2** pendalaman setelah demo atau yang bergantung keputusan lanjutan; **OUT** di luar versi awal. Prioritas belum menjadi izin menghapus requirement atau mempersempit produk. Jika estimasi 27 jam tidak cukup, status yang belum dibuat harus tetap terlihat.

Status implementasi dan tes untuk seluruh matriks pada revisi ini adalah **Belum dibuat / Belum dijalankan**. Tidak ada requirement dinyatakan lulus karena telah mendapat test ID. Saat implementasi, tambahkan path kode, migration, test case, commit, dan bukti hasil; minimal satu test dapat ditelusuri balik ke setiap requirement yang dinyatakan selesai.

Tidak semua paragraf PRD merupakan fungsi aplikasi: pembuka/tujuan, sumber dokumentasi, usulan roadmap dan daftar pertanyaan dicatat sebagai konteks atau keputusan. Batas OUT tidak dihitung sebagai fitur belum selesai. Seluruh butir berstatus Terbuka tetap memiliki disposisi pada register Q, termasuk hal yang belum punya solusi final.

Riwayat revisi: v1.0 arsitektur awal dan 20 tes; v1.1 menambah matriks cakupan individual, field listing, pengaturan admin, rancangan amendmen/refund, definisi analytics, dan katalog total 55 skenario pengujian. Persetujuan pemilik produk diperlukan hanya untuk keputusan produk yang masih terbuka, bukan untuk menyusun dokumentasi atau melanjutkan fondasi yang sudah diotorisasi.
