# RFC-001 — Matriks Cakupan PRD

Versi: 1.1  
Tanggal: 11 September 2026  
Status: pemetaan rancangan; implementasi dan tes belum dijalankan

Catatan superseding 15 September 2026: matriks ini adalah snapshot rancangan sebelum OpenWA/OTP WhatsApp dibatalkan. R-020–R-025, R-032, R-171, dan butir stack yang mengacu OpenWA tidak lagi berlaku untuk implementasi aktif; onboarding sekarang selesai setelah profil dan lokasi tersimpan. Gunakan migration `20260915120456_remove_openwa_otp_requirement.sql` dan kontrak auth/profil/lokasi sebagai sumber terbaru.

Acuan: [PRD v1.3](./PRD.md) dan [RFC-001 revisi 1.1](./RFC-001-arsitektur-barter.md). Snapshot PRD berasal dari commit `4f0d0221853c6ab35ada57065133157b1565800f`; L-n merujuk nomor baris snapshot tersebut, bukan nomor baris RFC. Dokumen ini tidak mengubah keputusan PRD.

## 1. Cara membaca dan batas klaim

Matriks memetakan 244 butir sumber, termasuk konteks/roadmap dan eksklusi, bukan 244 fitur independen. Tiap butir memiliki ID R yang stabil, lokasi sumber, bagian rancangan, data/API, skenario penerimaan, dan prioritas rekomendasi. Butir majemuk tetap satu baris sumber; semua klausanya harus diuji sebagai subkasus dari ID R tersebut, tidak cukup happy path saja.

Ada 31 pertanyaan/keputusan Q; 22 di antaranya memetakan seluruh butir PRD yang secara eksplisit berlabel **Terbuka**. Pertanyaan lainnya berasal dari usulan/keputusan lanjutan. Q-29 sampai Q-31 adalah pertanyaan tambahan dari RFC, bukan persyaratan baru yang sudah disetujui.

Kriteria penerimaan setiap R adalah perilaku yang tertulis pada kolom **Butir PRD / hasil yang harus dipenuhi**, diuji dengan skenario T terkait di RFC §17. Rute/API dalam matriks adalah kontrak rancangan, belum layanan yang tersedia. Kode T adalah rencana tes, bukan tanda tes lulus.

Status rancangan: **Dirancang** (kontrak dan penerimaan tersedia), **Bersyarat** (bergantung keputusan produk D/Q), **Konteks** (tujuan, stack, proses, atau roadmap), **Eksklusi** (batas scope). Status implementasi dan tes **semua R adalah Belum dibuat / Belum dijalankan** pada revisi ini.

Prioritas **P0/P1/P2/OUT** mengikuti RFC §25. Prioritas hanya rekomendasi pembagian demo, tidak menghapus kebutuhan produk. Semua P0 belum tentu muat dalam 27 jam; setelah estimasi implementasi, perubahan keluaran demo harus dinyatakan. R dengan status Bersyarat tidak menjadi final hanya karena diberi P0.

## 2. Ringkasan inventaris

| Kategori | Jumlah butir |
| --- | ---: |
| Dirancang | 166 |
| Bersyarat | 23 |
| Konteks | 46 |
| Eksklusi | 9 |
| Total butir sumber R | 244 |

Bagian pembuka/versi/header dan tautan referensi eksternal PRD bukan kebutuhan aplikasi. Register Q menangani pertanyaan terbuka. Tabel roadmap dan prioritas pengujian tetap dicatat sebagai konteks agar seluruh bagian PRD memiliki disposisi. Satu R boleh memakai lebih dari satu T; satu T boleh memiliki fixture/subkasus untuk beberapa R.

## 3.1. PRD 1. Tujuan dan target

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 · L12 | Target pengerjaan adalah **9 hari × 3 jam = 27 jam** untuk **demo terintegrasi dan uji coba terbatas**, bukan peluncuran transaksi nyata kepada masyarakat. Daftar fitur produk tidak berarti seluruhnya dijamin selesai dalam 27 jam. Pembagian prioritas demo pada bagian 17 masih berupa usulan. | 1, 18, 25 | Demo manifest; backlog dan bukti per alur | T-55 | Konteks | P0 |

## 3.2. PRD 2. Nilai produk dan peran

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-002 · L16 | Warga membutuhkan cara menemukan, menjual, menukar, dan membagikan barang di lingkungan sekitar. Pelaku usaha rumahan, terutama ibu rumah tangga, membutuhkan cara memasarkan catering, pre-order makanan, dan produk lainnya tanpa harus membangun toko online sendiri. | 1, 2, 6, 14 | profiles; transaksi lintas jenis; subscriptions; billing_orders | T-32, T-33, T-45, T-47 | Konteks | P0 |
| R-003 · L18 | Barter mempertemukan pembeli, penjual, pemberi, dan penerima. Platform membantu pencarian, percakapan, pencatatan kesepakatan, dan penyelesaian masalah. Pembayaran barang dilakukan langsung antar pengguna; Barter tidak menerima, menahan, atau meneruskan uang transaksi tersebut. | 1, 2, 6, 14 | profiles; transaksi lintas jenis; subscriptions; billing_orders | T-32, T-33, T-45, T-47 | Konteks | P0 |
| R-004 · L22 | Penawaran sekitar, dengan radius pencarian awal 5 km. | 12 | search_listings; approximate_point | T-22 | Konteks | P0 |
| R-005 · L23 | Jual beli, barter, dan pemberian gratis untuk mengurangi barang terbuang. | 7–9 | Transaction kinds sale/barter/free | T-30, T-32, T-33 | Konteks | P0 |
| R-006 · L24 | Katalog serta identitas toko bagi UMKM. | 6, 21 | stores; catalog; create_store | T-47 | Konteks | P0 |
| R-007 · L25 | Privasi lokasi pribadi. | 12–13 | Private/public projection; media processing | T-12, T-23 | Konteks | P0 |
| R-008 · L26 | Biaya platform transaksi barang 0%. | 9, 14 | Payment obligations; no transaction platform fee | T-45 | Konteks | P0 |
| R-009 · L27 | Pendapatan dari langganan Plus, bukan potongan transaksi barang. | 14 | subscriptions; invoice Plus; no escrow | T-09, T-45 | Konteks | P0 |
| R-010 · L29 | Pengguna utama adalah warga pembeli/penjual, usaha rumahan, pemilik toko Plus, dan admin. Satu akun dapat menjalankan peran pembeli, penjual pribadi, serta pemilik toko sekaligus. | 1, 2, 6, 14 | profiles; transaksi lintas jenis; subscriptions; billing_orders | T-32, T-33, T-45, T-47 | Konteks | P0 |

## 3.3. PRD 3. Wilayah dan platform

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-011 · L33 | Aplikasi web yang dioptimalkan untuk mobile; bukan aplikasi native. | 3, 12, 16 | service_areas; listing_discovery; search_listings; catering_terms | T-22, T-46 | Dirancang | P0 |
| R-012 · L34 | Wilayah peluncuran: Jabodetabek, tanpa Kepulauan Seribu. | 3, 12, 16 | service_areas; listing_discovery; search_listings; catering_terms | T-22, T-46 | Dirancang | P0 |
| R-013 · L35 | Interpretasi wilayah untuk implementasi: lima kota Jakarta; Kota/Kabupaten Bogor; Depok; Kota/Kabupaten Tangerang; Tangerang Selatan; Kota/Kabupaten Bekasi. Daftar kode wilayah final perlu diverifikasi saat integrasi data alamat. | 3, 12, 16 | service_areas; listing_discovery; search_listings; catering_terms | T-22 | Bersyarat | P0 |
| R-014 · L36 | Feed awal memakai radius 5 km. Pengguna dapat memperluas pencarian secara manual. | 3, 12, 16 | service_areas; listing_discovery; search_listings; catering_terms | T-22, T-46 | Dirancang | P0 |
| R-015 · L37 | Pencarian boleh melintasi batas kota selama penawaran berada dalam wilayah layanan. | 3, 12, 16 | service_areas; listing_discovery; search_listings; catering_terms | T-22, T-46 | Dirancang | P0 |
| R-016 · L38 | Catering dapat mencantumkan area layanan/pengantaran. | 21.3 | catering_terms.service_area_ids | T-22, T-34 | Dirancang | P0 |

## 3.4. PRD 4.1 Autentikasi

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-017 · L45 | Login melalui Google OAuth atau email/password menggunakan Supabase Auth. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-018 · L46 | Pengguna yang mendaftar melalui Google tetap wajib melengkapi nama, nomor HP, dan alamat/lokasi. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-019 · L47 | Akun Google tidak perlu membuat password Barter untuk menggunakan login Google. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-020 · L48 | Nomor HP diverifikasi melalui OTP WhatsApp dengan **rmyndharis/OpenWA**. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-021 · L49 | Satu nomor WhatsApp terverifikasi hanya dapat terhubung ke satu akun aktif. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-022 · L50 | Mengganti nomor memerlukan verifikasi nomor baru. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-023 · L51 | Nomor yang sudah digunakan tidak otomatis menggabungkan akun; diarahkan ke proses pemulihan akun. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Bersyarat | P0 |
| R-024 · L52 | Profil lengkap dan verifikasi nomor diperlukan sebelum memposting, mengirim chat, atau memulai transaksi. | 5, 11 | Supabase Auth; account_state; phone_claims; otp/request; otp/verify | T-01, T-21 | Dirancang | P0 |
| R-025 · L53 | Verifikasi nomor membuktikan penguasaan nomor, bukan verifikasi identitas hukum. | 11 | Verified phone label; no identity badge | T-21 | Dirancang | P0 |

## 3.5. PRD 4.2 Data profil

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-026 · L59 | Nama — Wajib — Nama tampilan publik | 5, 6.1, 11, 12 | profiles; phone_claims; user_locations; complete_profile | T-12, T-21, T-23 | Dirancang | P0 |
| R-027 · L60 | Email — Untuk akun email atau dari Google — Privat | 5, 6.1, 11, 12 | profiles; phone_claims; user_locations; complete_profile | T-12, T-21, T-23 | Dirancang | P0 |
| R-028 · L61 | Nomor WhatsApp — Wajib, terverifikasi — Privat secara default | 5, 6.1, 11, 12 | profiles; phone_claims; user_locations; complete_profile | T-12, T-21, T-23 | Dirancang | P0 |
| R-029 · L62 | Alamat/lokasi — Wajib untuk konteks lingkungan — Publik hanya area perkiraan | 5, 6.1, 11, 12 | profiles; phone_claims; user_locations; complete_profile | T-12, T-21, T-23 | Bersyarat | P0 |
| R-030 · L63 | Foto profil dan bio — Usulan opsional — Publik jika diisi | 5, 6.1, 11, 12 | profiles; phone_claims; user_locations; complete_profile | T-21 | Bersyarat | P0 |
| R-031 · L64 | Status verifikasi, reputasi, Plus, sanksi — Dikelola sistem — Sesuai tujuan masing-masing | 5, 6.1, 11, 12 | profiles; phone_claims; user_locations; complete_profile | T-12, T-21, T-23 | Dirancang | P0 |

## 3.6. PRD 4.3 OTP dan pengunjung

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-032 · L70 | **Usulan parameter awal:** kode 6 digit, masa berlaku 5 menit, sekali pakai, jeda kirim ulang 60 detik, serta batas percobaan dan pengiriman. Backend membuat dan memvalidasi kode; OpenWA hanya mengirim pesan. Keberhasilan pengiriman bukan bukti verifikasi nomor. | 3, 11 | otp_challenges; auth; public read projections | T-01, T-21, T-22 | Bersyarat | P0 |
| R-033 · L72 | **Usulan akses pengunjung:** feed, pencarian, detail listing, dan toko dapat dibuka tanpa login. Login diperlukan untuk aksi pribadi dan transaksi. Izin lokasi perangkat tidak wajib; lokasi bisa dipilih manual. | 3, 11 | otp_challenges; auth; public read projections | T-01, T-21, T-22 | Bersyarat | P0 |

## 3.7. PRD 5. Privasi lokasi

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-034 · L78 | Profil dan listing pribadi menampilkan lokasi perkiraan dan jarak yang dibulatkan; koordinat tepat tidak ditampilkan publik. | 12, 13.1, 15.1 | private locations; discovery projection; set_store_address_visibility | T-12, T-23 | Bersyarat | P0 |
| R-035 · L79 | Toko menggunakan lokasi perkiraan secara default. | 12, 13.1, 15.1 | private locations; discovery projection; set_store_address_visibility | T-12, T-23 | Dirancang | P0 |
| R-036 · L80 | Pemilik toko dapat secara sengaja memilih mempublikasikan alamat lengkap usaha. | 12, 13.1, 15.1 | private locations; discovery projection; set_store_address_visibility | T-12, T-23 | Dirancang | P0 |
| R-037 · L81 | Setiap toko dapat memiliki lokasi dan pengaturan visibilitas sendiri. | 12, 13.1, 15.1 | private locations; discovery projection; set_store_address_visibility | T-12, T-23 | Dirancang | P0 |
| R-038 · L82 | Titik pertemuan/pengambilan dibagikan secara sengaja melalui chat; kesepakatan barter tidak otomatis membuka alamat rumah. | 12, 13.1, 15.1 | private locations; discovery projection; set_store_address_visibility | T-12, T-23 | Dirancang | P0 |

## 3.8. PRD 6.1 Hak paket dan batas

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-039 · L91 | Listing pribadi aktif — Maksimal 20 — Maksimal 20 | 14, 22 | personal_active_limit=20; publish_listing | T-11, T-48 | Dirancang | P0 |
| R-040 · L92 | Jual dagangan usaha lewat listing biasa — Boleh — Boleh | 21 | Personal publisher; free account business posting | T-25 | Dirancang | P0 |
| R-041 · L93 | Toko — Tidak tersedia — Maksimal 3 | 14 | store limit=3; account guard | T-11, T-47 | Dirancang | P0 |
| R-042 · L94 | Produk aktif per toko — Tidak berlaku — Maksimal 100 | 14, 22 | store_product_active_limit=100; store guard | T-11, T-48 | Dirancang | P0 |
| R-043 · L95 | Promosi produk toko di feed — Tidak tersedia — Otomatis sesuai aturan promosi | 12.2 | promotion_rotation per eligible Plus owner | T-28 | Dirancang | P0 |
| R-044 · L97 | Toko bersifat opsional. Pengguna gratis boleh memposting catering, PO, dan dagangan preloved melalui listing biasa. | 6.1, 14, 22 | plan_settings; update_plan_limits; publish_listing; create_store | T-11, T-25, T-48 | Dirancang | P0 |
| R-045 · L98 | Draft, arsip, dan listing yang selesai tidak menghitung batas aktif. Listing direservasi tetap dihitung. | 6.1, 14, 22 | plan_settings; update_plan_limits; publish_listing; create_store | T-11, T-25, T-48 | Dirancang | P0 |
| R-046 · L99 | Batas listing/produk dapat diubah melalui pengaturan admin. | 22 | update_plan_limits; settings versions/history | T-48 | Dirancang | P1 |

## 3.9. PRD 6.2 Pengelolaan toko

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-047 · L104 | Satu akun Plus mengelola maksimal tiga toko, dengan profil dan katalog terpisah. | 6.1, 14, 21.3 | stores; private.store_locations; create_store; update_store | T-23, T-47 | Dirancang | P0 |
| R-048 · L105 | Setiap toko boleh memiliki lokasi usaha berbeda; penemuan/promosi mengikuti lokasi toko tersebut. | 6.1, 14, 21.3 | stores; private.store_locations; create_store; update_store | T-23, T-47 | Dirancang | P0 |
| R-049 · L106 | Saat memposting, pengguna memilih identitas profil pribadi atau toko terkait. | 6.1, 14, 21.3 | stores; private.store_locations; create_store; update_store | T-23, T-47 | Dirancang | P0 |
| R-050 · L107 | Hanya akun pemilik yang mengelola toko. Akses staf dan pembagian izin tidak termasuk versi awal. | 6.1, 14, 21.3 | stores; private.store_locations; create_store; update_store | T-23, T-47 | Dirancang | P0 |
| R-051 · L108 | Informasi toko yang diusulkan: nama, logo/foto, deskripsi, kategori usaha, lokasi, jam operasional, serta pilihan pengambilan/pengantaran. | 6.1, 14, 21.3 | stores; private.store_locations; create_store; update_store | T-47 | Bersyarat | P0 |

## 3.10. PRD 6.3 Plus dan pembayaran dummy

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-052 · L113 | Harga Plus: **Rp20.000 per bulan**. | 14.2, 22 | billing_orders; subscriptions; billing-demo/create; billing-demo/simulate | T-09, T-18, T-45 | Dirancang | P0 |
| R-053 · L114 | Metode pembayaran yang direncanakan: QRIS dan bank virtual account. | 14.2, 22 | billing_orders; subscriptions; billing-demo/create; billing-demo/simulate | T-09, T-18, T-45 | Dirancang | P0 |
| R-054 · L115 | Versi awal memakai pembayaran **dummy**, tanpa payment gateway atau transfer nyata. | 14.2, 22 | billing_orders; subscriptions; billing-demo/create; billing-demo/simulate | T-09, T-18, T-45 | Dirancang | P0 |
| R-055 · L116 | Tampilan pembayaran diberi label simulasi dan instruksi tidak perlu transfer. | 14.2, 22 | billing_orders; subscriptions; billing-demo/create; billing-demo/simulate | T-09, T-18, T-45 | Dirancang | P0 |
| R-056 · L117 | Simulasi mendukung berhasil, gagal, dan kedaluwarsa. Aktivasi melalui simulasi hanya untuk lingkungan pengembangan/demo. | 14.2, 22 | billing_orders; subscriptions; billing-demo/create; billing-demo/simulate | T-09, T-18, T-45 | Dirancang | P0 |
| R-057 · L118 | Usulan siklus: pembelian manual tanpa auto-debit; perpanjangan sebelum habis menambah masa aktif dari tanggal berakhir, sedangkan pembelian setelah habis dimulai dari aktivasi baru. | 14.2, 22 | billing_orders; subscriptions; billing-demo/create; billing-demo/simulate | T-09 | Bersyarat | P0 |

## 3.11. PRD 6.4 Plus berakhir

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-058 · L123 | Ketiga toko dan produknya disembunyikan dari publik; promosi berhenti. | 14.1, 3 | Entitlement on-read/on-command; paid_through; participant reads | T-10, T-47 | Dirancang | P0 |
| R-059 · L124 | Data toko/katalog tetap tersimpan untuk digunakan kembali setelah Plus aktif. | 14.1, 3 | Entitlement on-read/on-command; paid_through; participant reads | T-10, T-47 | Dirancang | P0 |
| R-060 · L125 | Listing pribadi tetap berjalan sesuai status masing-masing. | 14.1, 3 | Entitlement on-read/on-command; paid_through; participant reads | T-10, T-47 | Dirancang | P0 |
| R-061 · L126 | Chat dan transaksi yang sudah berjalan tetap dapat diakses serta diselesaikan. | 14.1, 3 | Entitlement on-read/on-command; paid_through; participant reads | T-10, T-47 | Dirancang | P0 |

## 3.12. PRD 7.1 Jenis penawaran

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-062 · L133 | **Jual:** harga dan pilihan bisa/tidak bisa ditawar. | 21.1 | negotiable; base_price; sale quote | T-24, T-32 | Dirancang | P0 |
| R-063 · L134 | **Barter:** barang yang diinginkan atau terbuka untuk tawaran. | 21.1 | barter_preferences.open_to_offers/wanted_description | T-24, T-29 | Dirancang | P0 |
| R-064 · L135 | **Jual atau barter:** satu listing mendukung kedua jalur dengan ketersediaan yang sama. | 6.1, 21.1 | listing_modes; fulfillment_kind; negotiable; barter_preferences | T-24, T-25 | Dirancang | P0 |
| R-065 · L136 | **Gratis:** tidak ada harga barang atau kewajiban memberikan barang pengganti. | 6.1, 21.1 | listing_modes; fulfillment_kind; negotiable; barter_preferences | T-24, T-25 | Dirancang | P0 |
| R-066 · L137 | Catering dan PO adalah bentuk penawaran usaha dengan kebutuhan jadwal, minimum pembelian, kuota, dan pesanan. | 21.3 | fulfillment_kind vs modes; catering/preorder terms | T-34, T-35 | Dirancang | P0 |
| R-067 · L139 | Listing pribadi dan toko adalah identitas penerbit; tidak boleh disamakan dengan jenis transaksi. Catering/PO juga tidak boleh diperlakukan sebagai pilihan yang bertentangan dengan kategori produk pada model data final. | 6.1, 21.1 | publisher, listing_modes, fulfillment_kind separate | T-24, T-25 | Dirancang | P0 |

## 3.13. PRD 7.2 Listing dan varian

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-068 · L143 | Barang preloved mencakup pakaian, furnitur, kendaraan, dan barang lain sesuai kategori yang akan ditetapkan. | 21.2 | categories; category_attributes; field registry | T-24 | Bersyarat | P0 |
| R-069 · L144 | Informasi dasar: nama, detail, foto, kategori, lokasi, jenis penawaran, serta harga jika dijual. | 6.1, 21 | categories; category_attributes; assets; variants; snapshots | T-24, T-26, T-34, T-35 | Dirancang | P0 |
| R-070 · L145 | Kondisi dan kekurangan barang harus bisa dijelaskan. Kelengkapan dokumen kendaraan dapat dicatat pada kesepakatan. | 21.2 | defects; condition; document_availability snapshot | T-24, T-26 | Dirancang | P0 |
| R-071 · L146 | Varian tersedia sejak versi awal. Setiap pilihan mempunyai nama dan harga sendiri. | 6.1, 21 | categories; category_attributes; assets; variants; snapshots | T-24, T-26, T-34, T-35 | Dirancang | P0 |
| R-072 · L147 | Ringkasan pesanan dapat berisi beberapa varian dengan jumlah dan subtotal masing-masing. | 6.1, 21 | categories; category_attributes; assets; variants; snapshots | T-24, T-26, T-34, T-35 | Dirancang | P0 |
| R-073 · L148 | Nama, harga, varian, dan ketentuan disimpan sebagai salinan kesepakatan; perubahan katalog tidak mengubah pesanan lama. | 6.1, 21 | categories; category_attributes; assets; variants; snapshots | T-24, T-26, T-34, T-35 | Dirancang | P0 |

## 3.14. PRD 7.3 Lifecycle listing

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-074 · L153 | Profil lengkap dan nomor terverifikasi dapat langsung menerbitkan listing setelah validasi informasi wajib, tanpa persetujuan admin. | 7, 8, 21.4 | publish/revise/archive_listing; tombstone; media snapshots; hide_listing | T-25, T-26, T-42 | Dirancang | P0 |
| R-075 · L154 | Pemilik dapat menyimpan draft, menerbitkan, mengedit, dan mengarsipkan listing. | 7, 8, 21.4 | publish/revise/archive_listing; tombstone; media snapshots; hide_listing | T-25, T-26, T-42 | Dirancang | P0 |
| R-076 · L155 | Listing yang sedang direservasi tidak dapat dihapus atau diubah detail penawarannya sampai transaksi selesai/dibatalkan. | 21.4 | Reservation guard; no exclusive item edit/delete | T-26 | Bersyarat | P0 |
| R-077 · L156 | Menghilangkan listing dari publik tidak menghapus riwayat transaksi atau bukti sengketa. | 7, 8, 21.4 | publish/revise/archive_listing; tombstone; media snapshots; hide_listing | T-25, T-26, T-42 | Dirancang | P0 |
| R-078 · L157 | Pengguna dapat melaporkan listing; admin dapat menyembunyikannya dengan alasan tercatat dan notifikasi kepada pemilik. | 7, 8, 21.4 | publish/revise/archive_listing; tombstone; media snapshots; hide_listing | T-25, T-26, T-42 | Dirancang | P0 |

## 3.15. PRD 8. Feed dan promosi

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-079 · L162 | Feed utama menggabungkan barang pribadi dan dagangan usaha sekitar. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-080 · L163 | Pencarian berdasarkan nama barang, produk, atau toko. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-081 · L164 | Filter: kategori, jarak, rentang harga, serta bentuk penawaran yang relevan. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-082 · L165 | Pengurutan: relevansi, terbaru, atau terdekat. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-27 | Dirancang | P1 |
| R-083 · L166 | Tab **Toko sekitar** untuk menemukan UMKM dan membuka katalog. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-084 · L167 | Kartu PO menampilkan batas pemesanan serta jadwal tersedia. | 12.2, 21.3 | PO closes_at + fulfillment_at card projection | T-27, T-34 | Dirancang | P0 |
| R-085 · L168 | Produk aktif dari toko Plus memenuhi syarat promosi otomatis dan bergiliran. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-086 · L169 | Maksimal satu slot promosi per 10 listing; label **Dipromosikan** wajib terlihat. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-087 · L170 | Porsi promosi dibagi per akun Plus, bukan per toko. Tiga toko tidak otomatis memberi tiga kali porsi. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-088 · L171 | Promosi tetap mengikuti filter serta area pencarian pembeli. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-22, T-27, T-28 | Dirancang | P0 |
| R-089 · L172 | Barang habis, direservasi, dan PO yang sudah ditutup tidak dipromosikan; penayangan dan penjualan tidak dijamin. | 12.2, 14 | search_listings; search_stores; listing_discovery; promotion_rotation | T-28 | Bersyarat | P0 |

## 3.16. PRD 9.1 Paket barter

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-090 · L179 | Ruang barter mempunyai kolom terpisah untuk A dan B. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |
| R-091 · L180 | Masing-masing boleh menawarkan beberapa barang; setiap barang mempunyai nama, detail, dan foto. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |
| R-092 · L181 | Barang bisa dipilih dari listing milik sendiri atau ditambahkan langsung dalam ruang barter. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |
| R-093 · L182 | Barang yang ditambahkan langsung tidak otomatis dipublikasikan. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |
| R-094 · L183 | Persetujuan berlaku untuk keseluruhan paket, bukan per barang. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |
| R-095 · L184 | Masing-masing pihak tetap menawarkan minimal satu barang. Uang saja untuk membeli barang memakai jalur jual beli. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |
| R-096 · L185 | Tambahan uang dalam rupiah boleh dibayarkan oleh satu pihak saja. Nominal dan pihak pembayar tercantum dalam penawaran. | 6.2, 7.2, 21.1 | transaction_items; revisions; create_trade; revise_trade; topup obligation | T-02, T-29, T-30 | Dirancang | P0 |

## 3.17. PRD 9.2 Consent barter

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-097 · L189 | A dan B menyusun penawaran masing-masing. | 7.2, 8.3 | revision/consents; mark_trade_ready; approve_trade; expected_revision | T-02, T-03, T-29, T-30 | Dirancang | P0 |
| R-098 · L190 | Masing-masing menekan **Siap**. | 7.2, 8.3 | revision/consents; mark_trade_ready; approve_trade; expected_revision | T-02, T-03, T-29, T-30 | Dirancang | P0 |
| R-099 · L191 | Setelah keduanya siap, tombol **Setujui** tersedia untuk keduanya. | 7.2, 8.3 | revision/consents; mark_trade_ready; approve_trade; expected_revision | T-02, T-03, T-29, T-30 | Dirancang | P0 |
| R-100 · L192 | Jika baru satu menyetujui, tampilkan menunggu pihak lain. | 7.2, 8.3 | revision/consents; mark_trade_ready; approve_trade; expected_revision | T-02, T-03, T-29, T-30 | Dirancang | P0 |
| R-101 · L193 | Setelah keduanya menyetujui, barter menjadi **Disepakati** dan pertemuan dapat diatur. | 7.2, 8.3 | revision/consents; mark_trade_ready; approve_trade; expected_revision | T-02, T-03, T-29, T-30 | Dirancang | P0 |
| R-102 · L195 | Perubahan nama, detail, foto, jumlah/anggota paket barang, nominal uang, atau pihak pembayar membatalkan seluruh status Siap dan Setujui kedua pihak. Keduanya harus meninjau versi baru dan menekan Siap lagi. Persetujuan atas versi lama tidak boleh menyelesaikan versi baru. | 7.2, 8.3 | revision/consents; mark_trade_ready; approve_trade; expected_revision | T-02, T-03, T-29, T-30 | Dirancang | P0 |

## 3.18. PRD 9.3 Reservasi dan penerimaan barter

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-103 · L199 | Beberapa negosiasi boleh berjalan atas barang yang sama. | 7.2, 8, 13.3 | inventory_pools; reservations; approve_trade; confirm_received; acknowledge_payment | T-03, T-04, T-15, T-31 | Dirancang | P0 |
| R-104 · L200 | Saat satu barter disepakati, semua listing yang terlibat direservasi dan tidak dapat disepakati dalam transaksi lain, termasuk jalur jual beli. | 7.2, 8, 13.3 | inventory_pools; reservations; approve_trade; confirm_received; acknowledge_payment | T-03, T-04, T-15, T-31 | Dirancang | P0 |
| R-105 · L201 | Negosiasi lain mendapat pemberitahuan bahwa barang direservasi. | 7.2, 8, 13.3 | inventory_pools; reservations; approve_trade; confirm_received; acknowledge_payment | T-03, T-04, T-15, T-31 | Dirancang | P0 |
| R-106 · L202 | Jika barter dibatalkan sebelum penyerahan sesuai aturan, reservasi dapat dilepas. | 7.2, 8, 13.3 | inventory_pools; reservations; approve_trade; confirm_received; acknowledge_payment | T-03, T-04, T-15, T-31 | Dirancang | P0 |
| R-107 · L203 | Penguncian otomatis berlaku pada identitas listing yang sama. Sistem belum dapat mengenali duplikasi barang yang dimasukkan langsung ke ruang berbeda. | 6.2, 8 | Linked listing locks; no cross-chat duplicate recognition for direct items | T-29, T-31 | Dirancang | P0 |
| R-108 · L204 | Saat bertemu, kedua pihak memeriksa barang asli terhadap penawaran. | 16 | Inspection instructions in handover UI | T-30 | Dirancang | P0 |
| R-109 · L205 | Tambahan uang dibayar saat serah terima setelah pemeriksaan; tidak ada DP barter. | 7.2, 9 | Topup at handover; no barter DP | T-15, T-30, T-45 | Dirancang | P0 |
| R-110 · L206 | Masing-masing menekan **Barang sudah diterima**, dengan penjelasan sudah memeriksa dan menerima barang. | 7.2 | confirm_received actor-only; inspection wording | T-30 | Dirancang | P0 |
| R-111 · L207 | Penerima uang tambahan juga menekan **Uang tambahan diterima**. | 7.2 | topup obligation; acknowledge_payment by payee | T-08, T-15 | Dirancang | P0 |
| R-112 · L208 | Barter selesai setelah seluruh konfirmasi penerimaan barang dan uang yang diperlukan terpenuhi. | 7.2 | complete_if_eligible | T-15, T-30 | Dirancang | P0 |

## 3.19. PRD 10.1 Jual beli preloved

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-113 · L215 | Pembeli dan penjual bernegosiasi melalui chat. | 7.3, 9, 21 | create/confirm_order_quote; reservations; fulfillments; acknowledgements | T-08, T-32, T-38 | Dirancang | P1 |
| R-114 · L216 | Penjual membuat ringkasan barang, harga akhir, dan cara penyerahan. | 7.3, 9, 21 | create/confirm_order_quote; reservations; fulfillments; acknowledgements | T-08, T-32, T-38 | Dirancang | P1 |
| R-115 · L217 | Pembeli mengonfirmasi; barang direservasi. | 7.3, 9, 21 | create/confirm_order_quote; reservations; fulfillments; acknowledgements | T-08, T-32, T-38 | Dirancang | P1 |
| R-116 · L218 | Pembeli memeriksa barang dan membayar langsung kepada penjual. | 7.3, 9, 21 | create/confirm_order_quote; reservations; fulfillments; acknowledgements | T-08, T-32, T-38 | Dirancang | P1 |
| R-117 · L219 | Penjual mengonfirmasi pembayaran dan penyerahan; pembeli mengonfirmasi penerimaan. | 7.3, 9, 21 | create/confirm_order_quote; reservations; fulfillments; acknowledgements | T-08, T-32, T-38 | Dirancang | P1 |
| R-118 · L220 | Setelah seluruh konfirmasi terpenuhi, transaksi selesai. | 7.3, 9, 21 | create/confirm_order_quote; reservations; fulfillments; acknowledgements | T-08, T-32, T-38 | Dirancang | P1 |

## 3.20. PRD 10.2 Pemberian gratis

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-119 · L224 | Listing jelas berlabel Gratis. | 7.3, 8, 9 | Free quote; shared pool; shipping obligation; handover/receipt commands | T-33, T-38 | Dirancang | P1 |
| R-120 · L225 | Pemilik memilih penerima; tidak wajib mengikuti urutan chat masuk. | 7.3 | create_order_quote by giver to selected recipient | T-33 | Dirancang | P1 |
| R-121 · L226 | Pemilik membuat kesepakatan barang, jumlah, dan cara penyerahan. | 7.3, 8, 9 | Free quote; shared pool; shipping obligation; handover/receipt commands | T-33, T-38 | Dirancang | P1 |
| R-122 · L227 | Penerima mengonfirmasi; barang/jumlah terkait direservasi. | 7.3, 8, 9 | Free quote; shared pool; shipping obligation; handover/receipt commands | T-33, T-38 | Dirancang | P1 |
| R-123 · L228 | Barang yang dapat dibagi, seperti hasil kebun, boleh dialokasikan kepada beberapa penerima sampai stok habis. | 7.3, 8, 9 | Free quote; shared pool; shipping obligation; handover/receipt commands | T-33, T-38 | Dirancang | P1 |
| R-124 · L229 | Kedua pihak mengonfirmasi serah terima untuk menyelesaikan transaksi. | 7.3, 8, 9 | Free quote; shared pool; shipping obligation; handover/receipt commands | T-33, T-38 | Dirancang | P1 |
| R-125 · L230 | Pengantaran dapat berbiaya, tetapi dipisahkan dari harga barang Rp0 dan disepakati sebelumnya. | 7.3, 8, 9 | Free quote; shared pool; shipping obligation; handover/receipt commands | T-33, T-38 | Dirancang | P1 |

## 3.21. PRD 11.1 Catering dan quote PO

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-126 · L237 | Catering memerlukan paket/menu, harga dan satuan, minimum pesanan jika ada, waktu persiapan, tanggal kebutuhan, dan area layanan. | 7.3, 21.3, 23 | catering_terms; preorder_batches; create/revise/confirm_order_quote | T-34, T-38, T-49 | Dirancang | P0 |
| R-127 · L238 | PO memerlukan produk/varian, harga dan satuan, minimum pembelian jika ada, batas pemesanan, jadwal tersedia, serta kuota jika dibatasi. | 7.3, 21.3, 23 | catering_terms; preorder_batches; create/revise/confirm_order_quote | T-34, T-38, T-49 | Dirancang | P0 |
| R-128 · L239 | Ketersediaan catering dikelola manual karena bergantung tanggal serta ukuran pesanan. | 7.3, 21.3, 23 | catering_terms; preorder_batches; create/revise/confirm_order_quote | T-34, T-38, T-49 | Dirancang | P0 |
| R-129 · L240 | Penjual membuat ringkasan pesanan dari chat; pembeli mengonfirmasi. | 7.3, 21.3, 23 | catering_terms; preorder_batches; create/revise/confirm_order_quote | T-34, T-38, T-49 | Dirancang | P0 |
| R-130 · L241 | Ringkasan mencakup pilihan produk, jumlah, subtotal, ongkir, total, jadwal/cara penyerahan, DP jika ada, pelunasan, dan ketentuan pembatalan. | 7.3, 21.3, 23 | catering_terms; preorder_batches; create/revise/confirm_order_quote | T-34, T-38, T-49 | Dirancang | P0 |
| R-131 · L242 | Perubahan pesanan yang sudah dikonfirmasi memerlukan konfirmasi ulang pembeli. | 8.2, 23 | Order amendment + current/accepted_revision | T-49 | Bersyarat | P0 |

## 3.22. PRD 11.2 Minimum dan kuota

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-132 · L247 | Minimum pembelian dihitung dari total semua varian. Minimum 10 pcs dapat dipenuhi dengan 6 varian A + 4 varian B. | 8, 21.3 | Minimum homogeneous quantities across variants | T-35 | Bersyarat | P0 |
| R-133 · L248 | Penjual memilih kuota bersama satu listing atau kuota terpisah per varian. | 6.1, 8.1, 21.3 | Batch/variant pools; confirm_order_quote; cancel_transaction | T-05, T-35 | Dirancang | P0 |
| R-134 · L249 | Kuota direservasi saat pembeli mengonfirmasi, termasuk saat menunggu DP. | 6.1, 8.1, 21.3 | Batch/variant pools; confirm_order_quote; cancel_transaction | T-05, T-35 | Dirancang | P0 |
| R-135 · L250 | Konfirmasi tidak boleh membuat kuota terlampaui. Jika tidak cukup, pembeli diminta menyesuaikan jumlah. | 6.1, 8.1, 21.3 | Batch/variant pools; confirm_order_quote; cancel_transaction | T-05, T-35 | Dirancang | P0 |
| R-136 · L251 | PO penuh ditandai tidak tersedia untuk jumlah yang telah habis. | 6.1, 8.1, 21.3 | Batch/variant pools; confirm_order_quote; cancel_transaction | T-05, T-35 | Dirancang | P0 |
| R-137 · L252 | Pembatalan mengembalikan kuota selama pemesanan masih dibuka. | 6.1, 8.1, 21.3 | Batch/variant pools; confirm_order_quote; cancel_transaction | T-05, T-35 | Dirancang | P0 |

## 3.23. PRD 11.3 DP

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-138 · L257 | DP opsional per PO; penjual menentukan persentasenya. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-139 · L258 | Total tagihan = total harga barang + ongkos kirim. Persentase DP dihitung dari total tersebut. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-140 · L259 | Contoh: total Rp100.000, DP 50% menghasilkan DP Rp50.000 dan sisa Rp50.000. | 9 | total=100000; dp=50000; balance=50000 | T-06 | Dirancang | P0 |
| R-141 · L260 | Setelah konfirmasi pesanan, status pembayaran menjadi **Menunggu DP** jika diwajibkan. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-142 · L261 | Pembeli membayar langsung. Penjual memeriksa uang masuk lalu menekan **Konfirmasi DP diterima**. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-143 · L262 | Pesanan yang mewajibkan DP baru bisa ditandai Diproses setelah konfirmasi penerimaan DP. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-144 · L263 | Pesanan tanpa DP melewati tahap ini. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-145 · L264 | Penjual menentukan tenggat DP, terlihat sebelum konfirmasi pembeli. | 9 | DP deadline type and snapshot visible before agreement | T-07, T-36 | Bersyarat | P0 |
| R-146 · L265 | Tenggat terlewat tanpa konfirmasi membuat pesanan berstatus **Perlu pemeriksaan pembayaran**. Kuota tetap direservasi sampai penjual memeriksa dan mengonfirmasi atau membatalkan. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |
| R-147 · L266 | Tidak ada pembatalan otomatis semata karena DP belum dikonfirmasi. | 7.3, 9, 13.3 | Obligations; dp_percent/due_at; acknowledge_payment; server clock/jobs | T-06, T-07, T-36 | Dirancang | P0 |

## 3.24. PRD 11.4 Pelunasan dan pembatalan PO

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-148 · L271 | Penjual menentukan pelunasan sebelum pengambilan/pengiriman atau saat serah terima. | 7.3, 7.4, 23 | Fulfillments; payment obligations; cancellation requests; refund requests | T-08, T-36, T-37, T-50 | Dirancang | P0 |
| R-149 · L272 | Penjual menekan **Konfirmasi pelunasan diterima** setelah memeriksa pembayaran. | 7.3, 7.4, 23 | Fulfillments; payment obligations; cancellation requests; refund requests | T-08, T-36, T-37, T-50 | Dirancang | P0 |
| R-150 · L273 | Status pembayaran terpisah dari pengerjaan: pesanan dapat Siap diambil tetapi belum lunas. | 7.3 | Fulfillment independent of payment obligations | T-36 | Dirancang | P0 |
| R-151 · L274 | Status penyerahan mencakup Siap diambil atau Sedang diantar sesuai metode. | 7.3, 7.4, 23 | Fulfillments; payment obligations; cancellation requests; refund requests | T-08, T-36, T-37, T-50 | Dirancang | P0 |
| R-152 · L275 | Penjual mengonfirmasi penyerahan, pembeli menekan Pesanan diterima. | 7.3, 7.4, 23 | Fulfillments; payment obligations; cancellation requests; refund requests | T-08, T-36, T-37, T-50 | Dirancang | P0 |
| R-153 · L276 | Pesanan selesai setelah kedua konfirmasi penyerahan/penerimaan dan konfirmasi pelunasan terpenuhi. | 7.3, 7.4, 23 | Fulfillments; payment obligations; cancellation requests; refund requests | T-08, T-36, T-37, T-50 | Dirancang | P0 |
| R-154 · L277 | Sebelum Diproses, pembeli boleh membatalkan dengan alasan. | 7.4 | cancel_transaction before processing | T-37 | Dirancang | P0 |
| R-155 · L278 | Setelah Diproses, pembeli mengajukan pembatalan yang memerlukan persetujuan penjual. | 7.4 | request_cancellation; respond_cancellation after processing | T-37 | Dirancang | P0 |
| R-156 · L279 | Ketentuan pembatalan ditampilkan sebelum kesepakatan. Pengembalian uang dilakukan langsung antar pihak. | 23.3 | cancellation policy snapshot + off-platform refund workflow | T-37, T-50 | Bersyarat | P0 |

## 3.25. PRD 12. Penyerahan dan ongkir

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-157 · L284 | Pilihan: diambil pembeli, bertemu di lokasi yang disepakati, atau diantar dengan pengaturan langsung antar pihak. | 9, 21.3, 23 | fulfillment options; terms_snapshot; shipping; quote/amendment commands | T-23, T-38 | Dirancang | P0 |
| R-158 · L285 | Pemesanan kurir dan pelacakan otomatis tidak tersedia pada versi awal. | 2.2, 21.3 | No automatic courier/track API | T-38, T-45 | Dirancang | P0 |
| R-159 · L286 | Ongkir harus diketahui dan masuk ringkasan sebelum konfirmasi; ongkir yang masih dihitung menghalangi konfirmasi. | 9, 21.3, 23 | fulfillment options; terms_snapshot; shipping; quote/amendment commands | T-23, T-38 | Dirancang | P0 |
| R-160 · L287 | Perubahan ongkir/metode penyerahan setelah kesepakatan memerlukan persetujuan ulang. | 23 | Amendment shipping/fulfillment | T-38, T-49 | Bersyarat | P0 |
| R-161 · L288 | Alamat penyerahan yang dibagikan tetap berada dalam konteks transaksi, bukan otomatis dipublikasikan. | 9, 21.3, 23 | fulfillment options; terms_snapshot; shipping; quote/amendment commands | T-23, T-38 | Dirancang | P0 |

## 3.26. PRD 13.1 Chat

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-162 · L294 | Satu percakapan untuk pasangan pengguna pada satu listing; pembicaraan listing berbeda terpisah. | 13.2, 15.1 | conversations; members; messages; send_message; read cursor; blocks/reports | T-12, T-13, T-16, T-39, T-40 | Dirancang | P0 |
| R-163 · L295 | Pesanan ulang di listing yang sama dapat memakai percakapan yang sama dengan kartu kesepakatan berbeda. | 13.2, 15.1 | conversations; members; messages; send_message; read cursor; blocks/reports | T-12, T-13, T-16, T-39, T-40 | Dirancang | P0 |
| R-164 · L296 | Mendukung teks, foto kondisi barang/bukti transfer, kartu listing, kartu kesepakatan, dan status transaksi. | 13.2, 15.1 | conversations; members; messages; send_message; read cursor; blocks/reports | T-12, T-13, T-16, T-39, T-40 | Dirancang | P0 |
| R-165 · L297 | Mendukung penanda terkirim/dibaca dan jumlah belum dibaca; pembaruan real-time ketika aplikasi dibuka. | 13.2, 15.1 | conversations; members; messages; send_message; read cursor; blocks/reports | T-12, T-13, T-16, T-39, T-40 | Dirancang | P0 |
| R-166 · L298 | Pengguna dapat memblokir pengguna lain atau melaporkan percakapan. | 13.2, 15 | blocks/reports; block commands; case context | T-40, T-42 | Bersyarat | P1 |
| R-167 · L299 | Pesan terkirim tidak bisa diedit/ditarik pada versi awal; koreksi lewat pesan baru. | 13.2, 15.1 | conversations; members; messages; send_message; read cursor; blocks/reports | T-12, T-13, T-16, T-39, T-40 | Dirancang | P0 |

## 3.27. PRD 13.2 Notifikasi

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-168 · L304 | Pusat notifikasi dalam aplikasi untuk pesan, perubahan barter, persetujuan, pesanan, tenggat DP, pembayaran, penyerahan, pembatalan, laporan, keputusan admin, dan Plus. | 13.3 | notifications; system_jobs; list/mark_notification_read; dedupe keys | T-16, T-41, T-43 | Dirancang | P1 |
| R-169 · L305 | Setiap notifikasi menuju konteks terkait. | 13.3 | notifications; system_jobs; list/mark_notification_read; dedupe keys | T-16, T-41, T-43 | Dirancang | P1 |
| R-170 · L306 | Pengingat tenggat dikirim sekali per tahap; bukan berulang tanpa batas. | 13.3 | notifications; system_jobs; list/mark_notification_read; dedupe keys | T-16, T-41, T-43 | Dirancang | P1 |
| R-171 · L307 | WhatsApp hanya digunakan untuk OTP pada versi awal. | 11, 13 | OpenWA adapter limited to OTP | T-41, T-45 | Dirancang | P1 |
| R-172 · L308 | Tidak ada push notification; saat aplikasi ditutup belum ada pemberitahuan langsung aktivitas transaksi. | 13.3 | In-app notification only | T-41, T-45 | Dirancang | P1 |

## 3.28. PRD 14.1 Pembatalan dan laporan barter

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-173 · L315 | Sebelum konfirmasi penerimaan barang, salah satu pihak boleh membatalkan dengan alasan wajib. Pihak lain diberi tahu dan reservasi dapat dilepas. | 7.4, 15.2, 23 | cancel_transaction; create_report; case hold; receipt/events | T-14, T-19, T-37, T-42 | Dirancang | P0 |
| R-174 · L316 | Setelah satu pihak mengonfirmasi penerimaan, pembatalan biasa dinonaktifkan. Pengguna menggunakan Laporkan masalah; reservasi tetap ditahan selama sengketa. | 7.4, 15.2, 23 | cancel_transaction; create_report; case hold; receipt/events | T-14, T-19, T-37, T-42 | Dirancang | P0 |
| R-175 · L317 | Pelaporan tetap tersedia setelah transaksi selesai jika masalah baru ditemukan. | 7.4, 15.2, 23 | cancel_transaction; create_report; case hold; receipt/events | T-14, T-19, T-37, T-42 | Dirancang | P0 |
| R-176 · L318 | Pemeriksaan fisik dilakukan oleh pihak bertransaksi saat bertemu; penolakan sebelum pertukaran dapat diselesaikan dengan pembatalan beralasan. | 7.4, 15.2, 23 | cancel_transaction; create_report; case hold; receipt/events | T-14, T-19, T-37, T-42 | Dirancang | P0 |

## 3.29. PRD 14.2 Moderasi dan bukti

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-177 · L322 | Laporan masuk panel admin dengan alasan, penjelasan, bukti opsional, salinan kesepakatan, serta riwayat perubahan/status. | 15, 22, 23.3 | reports/evidence/access logs; record_report_decision; sanctions | T-12, T-13, T-42, T-50 | Dirancang | P1 |
| R-178 · L323 | Admin boleh melihat chat terkait transaksi yang dilaporkan; percakapan di luar lingkup tersebut tetap privat. Akses ini dijelaskan kepada pengguna. | 13.2, 15.1 | Case-scoped admin-evidence + access log | T-12, T-13 | Bersyarat | P1 |
| R-179 · L324 | Admin menjadi penengah dan memberikan keputusan akhir penanganan di platform, termasuk menentukan apakah barang harus dikembalikan. | 15.2, 23.3 | record_report_decision; return_required; physical followup | T-42, T-50 | Bersyarat | P1 |
| R-180 · L325 | Pengembalian fisik dilakukan para pihak, bukan platform. | 15, 22, 23.3 | reports/evidence/access logs; record_report_decision; sanctions | T-12, T-13, T-42, T-50 | Dirancang | P1 |
| R-181 · L326 | Keputusan, alasan, bukti pendukung, tenggat tindak lanjut, dan riwayat tindakan dicatat. | 15, 22, 23.3 | reports/evidence/access logs; record_report_decision; sanctions | T-12, T-13, T-42, T-50 | Dirancang | P1 |
| R-182 · L327 | Sanksi berupa pembatasan akun hingga ban sesuai tingkat/pengulangan pelanggaran. | 15, 22, 23.3 | reports/evidence/access logs; record_report_decision; sanctions | T-12, T-13, T-42, T-50 | Dirancang | P1 |
| R-183 · L328 | Akun yang dibatasi tetap dapat mengakses chat sengketa dan laporan untuk menyelesaikan kewajiban. | 15, 22, 23.3 | reports/evidence/access logs; record_report_decision; sanctions | T-12, T-13, T-42, T-50 | Dirancang | P1 |
| R-184 · L329 | Kasus dugaan pelanggaran hukum dapat dieskalasikan secara manual kepada kepolisian dengan bukti terkait. Keputusan moderasi bukan penetapan bersalah secara hukum; tidak ada pelaporan otomatis. | 2.2, 15.2 | Manual evidence escalation; no police API/auto-report | T-42, T-45 | Dirancang | P1 |

## 3.30. PRD 14.3 Transaksi menggantung

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-185 · L334 | Jika satu pihak sudah mengonfirmasi penerimaan tetapi pihak lain belum merespons: pengingat dalam aplikasi setelah 24 jam. | 7.5, 13.3, 15.2 | first_received_at; jobs; request_admin_help; report_decisions | T-14, T-42, T-43 | Dirancang | P1 |
| R-186 · L335 | Setelah tiga hari, pihak yang sudah mengonfirmasi dapat meminta bantuan admin. | 7.5, 13.3, 15.2 | first_received_at; jobs; request_admin_help; report_decisions | T-14, T-42, T-43 | Dirancang | P1 |
| R-187 · L336 | Tidak otomatis selesai karena waktu berlalu. | 7.5, 13.3, 15.2 | first_received_at; jobs; request_admin_help; report_decisions | T-14, T-42, T-43 | Dirancang | P1 |
| R-188 · L337 | Admin memeriksa riwayat/bukti/keterangan untuk memutuskan status dan reservasi dengan alasan tercatat. | 7.5, 13.3, 15.2 | first_received_at; jobs; request_admin_help; report_decisions | T-14, T-42, T-43 | Dirancang | P1 |
| R-189 · L338 | Laporan masalah tetap dapat dibuat tanpa menunggu tiga hari. | 7.5, 13.3, 15.2 | first_received_at; jobs; request_admin_help; report_decisions | T-14, T-42, T-43 | Dirancang | P1 |

## 3.31. PRD 15. Rating dan reputasi

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-190 · L343 | Ulasan hanya untuk transaksi Selesai; satu ulasan per pihak yang berhak. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-191 · L344 | Bintang 1–5 dengan komentar opsional. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-192 · L345 | Jual beli/makanan: pembeli menilai penjual. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-193 · L346 | Barter: kedua pihak saling menilai. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-194 · L347 | Gratis: penerima menilai pemberi. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-195 · L348 | Transaksi pribadi masuk reputasi profil; transaksi toko masuk reputasi toko terkait, terpisah antar toko. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-196 · L349 | Pemilik dapat membalas dan melaporkan ulasan, tetapi tidak menghapus sendiri. | 15.3 | reviews/replies; submit_review; reply_review; report_review; publish job | T-17, T-44 | Dirancang | P1 |
| R-197 · L350 | Ulasan barter ditampilkan setelah keduanya mengulas atau setelah batas 14 hari. Usulan acuan waktu: sejak transaksi Selesai. | 15.3 | Two reviews or completed_at+14d publication | T-17, T-44 | Bersyarat | P1 |

## 3.32. PRD 16. Stack dan batas backend

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-198 · L357 | React untuk antarmuka. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-199 · L358 | Vercel untuk hosting aplikasi. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-200 · L359 | Supabase untuk autentikasi dan backend. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-201 · L360 | rmyndharis/OpenWA untuk pengiriman OTP WhatsApp. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-202 · L364 | Supabase Database, Storage, dan Realtime untuk data, lampiran, dan chat. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-203 · L365 | Backend memvalidasi tindakan sensitif: OTP, persetujuan, reservasi, kuota, pembayaran manual, hak Plus, dan sanksi. Validasi tidak boleh hanya dilakukan di tampilan. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-204 · L366 | OpenWA berjalan sebagai layanan terpisah dengan sesi tersimpan; kredensialnya hanya di backend. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-205 · L367 | Identitas versi kesepakatan dan pembaruan ketersediaan yang tidak dapat bertabrakan dibutuhkan untuk persetujuan serta reservasi. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-206 · L368 | Data uji dan mode pembayaran dummy diberi penanda yang jelas. | 4, 5, 11, 13, 18.2 | React/Vercel; Supabase; OpenWA; config/grants/RLS; deployment manifest | T-12, T-18, T-55 | Konteks | P0 |
| R-207 · L370 | Belum ditentukan: framework/routing React, lokasi backend endpoint, hosting OpenWA, penyedia email produksi, penyedia peta/geocoding, versi dependensi, dan strategi pekerjaan terjadwal. Pemilihan teknis ini tidak boleh dianggap sudah diputuskan hanya karena tercantum sebagai kebutuhan. | 4, 18.2 | Deployment dependencies + environment manifest | T-55 | Bersyarat | P0 |

## 3.33. PRD 17. Rencana dan verifikasi demo

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-208 · L381 | Ini rancangan pembagian waktu, belum komitmen bahwa seluruh fitur produk selesai dalam 27 jam. Untuk menjaga demo dapat diperagakan, hari 7–9 juga menyediakan ruang integrasi dan perbaikan; fitur yang belum berjalan harus diberi status jelas, bukan ditampilkan seolah berfungsi. | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-209 · L385 | 1 — Fondasi aplikasi, model data inti, auth dan profil — Akun uji dapat masuk; keputusan integrasi OpenWA dan akses lingkungan jelas | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-210 · L386 | 2 — Listing, lokasi, feed dan pencarian — Penawaran uji dapat dibuat dan ditemukan sesuai area | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-211 · L387 | 3 — Chat dan kartu kesepakatan — Dua akun berkomunikasi dalam konteks listing | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-212 · L388 | 4 — Barter, revisi persetujuan, tambahan uang, reservasi — Demonstrasi dua pihak dari penawaran sampai penerimaan | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-213 · L389 | 5 — PO, varian, kuota, DP dan pelunasan manual — Demonstrasi pesanan dengan DP dan serah terima | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-214 · L390 | 6 — Toko, Plus dummy, visibilitas dan promosi dasar — Aktivasi/berakhirnya Plus dapat diperagakan | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-215 · L391 | 7 — Jual beli/gratis dan integrasi status — Alur yang dapat memakai kembali komponen kesepakatan tersambung | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-216 · L392 | 8 — Laporan/admin, ulasan dan notifikasi minimum — Laporan nyata dari data uji dapat dibuka dan ditangani | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-217 · L393 | 9 — Pengujian lintas akun, mobile, perbaikan, naskah demo — Demo terintegrasi dengan daftar keterbatasan yang diketahui | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-218 · L395 | **Keputusan berikutnya:** menentukan alur mana yang wajib berjalan penuh pada hari ke-9 dan mana yang boleh tetap berupa rancangan jika waktu tidak cukup. Kandidat inti: barter dua pihak, PO dengan DP, serta aktivasi toko Plus dummy. Autentikasi, listing, chat, dan kontrol akses menjadi fondasi untuk kandidat tersebut. | 17, 18, 25 | Backlog; migration; test evidence; demo manifest | T-01, T-02, T-03, T-05, T-08, T-10, T-12, T-13, T-55 | Konteks | P0 |
| R-219 · L399 | Mengubah barang/uang membatalkan persetujuan lama. | 7.2 | Versioned consent test | T-02 | Konteks | P0 |
| R-220 · L400 | Satu listing tidak dapat disepakati dua transaksi bersamaan. | 8 | Cross-transaction reservation | T-03 | Konteks | P0 |
| R-221 · L401 | Dua pembeli tidak dapat mengambil kuota terakhir yang sama. | 8 | Quota concurrency | T-05 | Konteks | P0 |
| R-222 · L402 | Pengguna tidak bisa mengonfirmasi pembayaran sebagai pihak lain. | 5, 7.3 | Payee-only acknowledgment | T-08 | Konteks | P0 |
| R-223 · L403 | Plus kedaluwarsa menyembunyikan toko tanpa menghilangkan transaksi berjalan. | 14 | Expiry eligibility and participant reads | T-10 | Konteks | P0 |
| R-224 · L404 | Profil/koordinat privat dan chat pengguna lain tidak terbuka melalui akses langsung. | 5, 12, 13 | RLS/direct REST/storage protections | T-12 | Konteks | P0 |
| R-225 · L405 | OTP salah/kedaluwarsa tidak memverifikasi nomor. | 11 | OTP digest/challenge validation | T-01 | Konteks | P0 |
| R-226 · L406 | Laporan admin mempertahankan bukti dan keputusan tercatat. | 15 | Audit/evidence preserved | T-13, T-42 | Konteks | P0 |

## 3.34. PRD 18. Keberhasilan dan metrik

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-227 · L410 | Keberhasilan demo dinilai dari alur prioritas yang berjalan antarakun, konsistensi status, privasi akses, dan kemampuan diperagakan pada layar mobile. Target angka dan daftar alur wajib masih terbuka. | 17, 18, 25 | Demo acceptance manifest and actual evidence | T-46, T-55 | Konteks | P0 |
| R-228 · L412 | Metrik produk setelah pilot nyata: listing aktif per minggu per area, transaksi selesai menurut jenis, waktu respons chat, retensi pengguna, toko aktif, dan konversi Plus. Target angka ditentukan setelah profil pilot jelas. | 24 | product_events; visibility_periods; activity_days; rollups; metrics API | T-51, T-52, T-53, T-54 | Bersyarat | P2 |

## 3.35. PRD 18. Batas versi awal

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-229 · L416 | Pembayaran online/escrow untuk transaksi barang. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-230 · L417 | Payment gateway nyata untuk Plus; saat ini dummy. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-231 · L418 | Push notification dan aplikasi native. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-232 · L419 | Pemesanan/pelacakan kurir otomatis. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-233 · L420 | Akses staf toko. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-234 · L421 | DP untuk barter. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-235 · L422 | Penyuntingan/penarikan pesan chat. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-236 · L423 | Pelaporan kepolisian otomatis. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |
| R-237 · L424 | Peluncuran transaksi nyata pada hari ke-9. | 2.2, 14, 18 | Negative feature checks; config; contract review; demo manifest | T-18, T-45, T-55 | Eksklusi | OUT |

## 3.36. PRD 19. Proses lanjutan

| ID / sumber | Butir PRD / hasil yang harus dipenuhi | RFC § | Data / API / artefak | Tes rencana | Rancangan | Demo |
| --- | --- | --- | --- | --- | --- | --- |
| R-238 · L430 | Alur demo yang wajib selesai dalam 27 jam. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |
| R-239 · L431 | Data listing/form toko, kategori, foto, stok non-PO, dan siklus batch PO. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |
| R-240 · L432 | Penyesuaian kesepakatan setelah reservasi atau DP sudah diterima. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |
| R-241 · L433 | Blokir, ban, sengketa, banding, dan pengembalian barang/dana. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |
| R-242 · L434 | Detail alamat, pemulihan akun, dan kegagalan OTP. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |
| R-243 · L435 | Aturan operasional tersisa dan kriteria penerimaan per alur. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |
| R-244 · L437 | Setelah keputusan tersebut cukup jelas, revisi PRD menjadi baseline yang disepakati lalu turunkan ke FRD: model data, state transition, otorisasi, API, pengujian, dan urutan implementasi. Belum ada kode aplikasi atau deployment yang dibuat sebagai bagian penyusunan draft ini. | 3, 18, 25 | Decision register Q; backlog; PRD baseline; evidence ledger | T-55 | Konteks | P1 |

## 4. Register keputusan terbuka

Semua Q di bawah berstatus **Belum final**. Penutupan Q harus mencatat keputusan, tanggal, perubahan PRD/RFC, R yang terkena dampak, dan tes terkait. Persetujuan melengkapi matriks tidak otomatis menutup Q atau D.

| ID / sumber | Pokok sumber | Rekomendasi / penanganan | Rujukan | Tes terkait | Prioritas |
| --- | --- | --- | --- | --- | --- |
| Q-01 · L66 | apakah alamat wajib cukup wilayah administratif dan titik peta atau mencakup jalan/nomor rumah. Rekomendasi brainstorming: area dan titik lokasi wajib, detail alamat rumah opsional. Rekomendasi ini perlu dikonfirmasi sebelum formulir final. | Wajibkan area+titik sebagai usulan; detail jalan belum final. | D-01; RFC §11–12 | T-21, T-23 | P0 |
| Q-02 · L39 | pilihan radius maksimum dan aturan akses pengguna yang berdomisili di luar Jabodetabek. Usulan sebelumnya adalah membatasi lokasi penerbitan listing/toko, bukan domisili akun. | Batas 5/10/20/50 dan eligibility penerbit perlu keputusan; fondasi geo bisa dikerjakan. | D-02; RFC §12 | T-22 | P0 |
| Q-03 · L74 | pemulihan akun saat nomor lama hilang, penautan Google dengan akun email yang sudah ada, kebijakan nomor yang didaur ulang, penghapusan akun, dan perilaku ketika OTP tidak terkirim. | Jalur recovery/admin, identity linking, recycled phone, penghapusan/retensi akun belum final; kegagalan OTP tidak membypass verifikasi. | RFC §11.3, §5 | T-01, T-21 | P2 |
| Q-04 · L83 | tingkat penyamaran, ukuran area, pembulatan jarak, dan penggunaan lokasi rumah dibanding titik pengambilan sebagai acuan listing. FRD harus memastikan data yang dikirim ke pengunjung juga tidak membocorkan koordinat privat. | Grid perkiraan 1 km dan pembulatan adalah rekomendasi; tidak mempublikasikan titik tepat. | D-02; RFC §12 | T-12, T-23 | P0 |
| Q-05 · L100 | kebijakan penerapan perubahan batas untuk akun yang sudah melampaui batas baru. | Penurunan limit menahan publish baru, bukan menghapus data; perlu keputusan produk. | D-14; RFC §22 | T-11, T-48 | P1 |
| Q-06 · L109 | aturan memindahkan listing pribadi ke toko, penggantian/penghapusan toko, dan apakah sebuah produk boleh dimuat di beberapa toko. | Tidak pindah penerbit setelah transaksi dan tidak duplikasi SKU lintas toko pada demo; aturan delete/transfer final belum disetujui. | D-15; RFC §21.4 | T-26, T-47 | P2 |
| Q-07 · L149 | daftar kategori dan field wajib per kategori, batas foto/ukuran berkas, dukungan stok barang non-PO, serta kombinasi atribut varian. | Registry/varian/stok dan media dirancang; kategori/field wajib final serta kombinasi atribut belum disepakati. | D-11/D-12; RFC §21 | T-24, T-26, T-34, T-35 | P0 |
| Q-08 · L119 | definisi satu bulan kalender versus durasi hari tetap, zona waktu penagihan, dan detail siklus langganan final. | Satu bulan kalender lokal dengan clamp akhir bulan adalah usulan; siklus tanpa auto-debit juga perlu baseline. | D-06; RFC §14.2 | T-09, T-47 | P0 |
| Q-09 · L127 | perilaku negosiasi toko yang belum menjadi kesepakatan saat masa aktif habis. | Draft tersimpan tetapi agreement baru memerlukan Plus aktif; perlu keputusan. | D-07; RFC §14.1 | T-10, T-47 | P0 |
| Q-10 · L158 | penerapan penguncian perubahan pada listing berkuota yang memiliki beberapa pesanan bersamaan. Aturan barang tunggal tidak boleh secara tidak sengaja mengunci seluruh operasional PO. | Pisahkan penguncian barang tunggal dari katalog berkuota; snapshot lama tidak berubah. | D-04; RFC §21.4 | T-26, T-35 | P0 |
| Q-11 · L173 | aturan produk yang sebagian kuotanya direservasi, pengulangan produk di satu feed, daftar pilihan radius, favorit, mengikuti toko, dan pembagian tautan. | Parsial stok dan dedupe dirancang sebagai usulan; favorit/follow/share belum disepakati dan belum ditambahkan sebagai fitur wajib. | D-02/D-04; RFC §12.2 | T-27, T-28 | P1 |
| Q-12 · L243 | mekanisme perubahan ketika DP sudah dibayar, termasuk selisih tagihan dan penyesuaian kuota. | Amendmen berbayar punya desain delta/receipt/refund; kebijakan setelah processing dan prioritas UI demo belum final. | D-03; RFC §23 | T-49, T-50 | P2 |
| Q-13 · L209 | apakah perubahan setelah status Disepakati membuka ulang penawaran dalam transaksi yang sama atau harus melalui pembatalan. Reservasi tidak boleh dilepas hanya karena salah satu pihak mengedit sepihak. | Revisi menahan reservasi lama; ada proposal, accept/reject/withdraw; pemakaian setelah agreed belum final. | D-03; RFC §8.2, §23.1 | T-02, T-04, T-49 | P2 |
| Q-14 · L231 | konfirmasi ongkir pada pemberian gratis dan pemeriksaan ketersediaan stok terbagi. | Ongkir gratis menjadi kewajiban terpisah; pool kuantitas mencegah kelebihan alokasi; perlu keputusan konfirmasi ongkir. | RFC §7.3, §21.3 | T-33, T-38 | P1 |
| Q-15 · L253 | pengulangan PO dalam batch/tanggal berbeda dan pemesanan campuran satuan yang tidak dapat dijumlahkan langsung. | Batch baru memiliki pool baru; satuan minimum homogen; otomatisasi batch tidak dijanjikan. | D-05/D-12; RFC §21.3 | T-05, T-35 | P1 |
| Q-16 · L267 | pembulatan rupiah, batas persentase DP, tenggat berupa waktu absolut atau durasi per pesanan, serta pesanan yang terus tertahan karena penjual tidak memeriksa pembayaran. | Pembulatan dan deadline dirancang; batas waktu penjual meninjau DP yang menggantung belum final, tidak auto-cancel. | D-12/D-16; RFC §9 | T-06, T-07, T-36 | P0 |
| Q-17 · L280 | kebijakan DP pada pembatalan dan pencatatan pengembalian dana; konfirmasi manual pembayaran tidak membuktikan adanya transfer melalui platform. | Ledger/konfirmasi refund dirancang; hak/nominal refund dari kesepakatan atau keputusan kasus, bukan default hangus/kembali. | RFC §23.2–23.3 | T-37, T-49, T-50 | P2 |
| Q-18 · L300 | dampak blokir terhadap transaksi aktif, batas lampiran, serta pemisahan akses admin ketika satu chat berisi beberapa transaksi dan hanya satu dilaporkan. | Block transaksi aktif, batas foto, dan akses bukti per transaksi tetap usulan; pesan transaksi lain tidak otomatis terbuka. | D-08/D-09/D-11; RFC §13, §15 | T-12, T-13, T-39, T-40 | P1 |
| Q-19 · L309 | jarak waktu pengingat Plus/DP dan jadwal pengingat relatif terhadap tenggat. | Dedup/job dirancang; jarak pengingat DP/Plus masih parameter belum disepakati. | RFC §13.3 | T-16, T-41 | P1 |
| Q-20 · L330 | akses akun yang terkena ban penuh, tahapan laporan, tenggat/banding keputusan, verifikasi pengembalian barang, serta pembagian peran admin. | Siklus kasus/akses ban sebagai usulan; deadline, banding, role dan bukti pengembalian fisik belum final. | D-08/D-13; RFC §15.2, §23.3 | T-14, T-19, T-42, T-50 | P1 |
| Q-21 · L339 | tenggat pertemuan yang tidak terlaksana ketika belum ada konfirmasi penerimaan sama sekali. | 24/72 jam berlaku setelah penerimaan pertama; no-show tanpa penerimaan belum memiliki auto-expiry yang disepakati. | RFC §7.5 | T-31, T-43 | P2 |
| Q-22 · L351 | penyuntingan ulasan, hak ulasan pada transaksi yang diselesaikan admin, dan perlakuan ulasan ketika transaksi kemudian disengketakan/dibatalkan. | Review edit, keputusan admin, dan dampak sengketa perlu keputusan; tidak membuka rating lawan lebih awal. | RFC §15.3 | T-17, T-44 | P1 |
| Q-23 · L395 | **Keputusan berikutnya:** menentukan alur mana yang wajib berjalan penuh pada hari ke-9 dan mana yang boleh tetap berupa rancangan jika waktu tidak cukup. Kandidat inti: barter dua pihak, PO dengan DP, serta aktivasi toko Plus dummy. Autentikasi, listing, chat, dan kontrol akses menjadi fondasi untuk kandidat tersebut. | Prioritas demo P0/P1/P2 rekomendasi, bukan persetujuan memotong scope; requirement yang belum dibuat tetap tercatat. | RFC §18, §25 | T-55 | P0 |
| Q-24 · L412 | Metrik produk setelah pilot nyata: listing aktif per minggu per area, transaksi selesai menurut jenis, waktu respons chat, retensi pengguna, toko aktif, dan konversi Plus. Target angka ditentukan setelah profil pilot jelas. | Definisi/cohort disediakan, target angka bisnis dan batas pengumpulan/retensi perlu ditetapkan sebelum pilot nyata. | RFC §24 | T-51, T-52, T-53, T-54 | P2 |
| Q-25 · L370 | Belum ditentukan: framework/routing React, lokasi backend endpoint, hosting OpenWA, penyedia email produksi, penyedia peta/geocoding, versi dependensi, dan strategi pekerjaan terjadwal. Pemilihan teknis ini tidak boleh dianggap sudah diputuskan hanya karena tercantum sebagai kebutuhan. | Provider peta/SMTP/host OpenWA, versi dependency dan kapasitas belum dipilih; arsitektur tidak mengklaim dependency siap. | RFC §4, §18.2 | T-21, T-22, T-55 | P0 |
| Q-26 · L72 | **Usulan akses pengunjung:** feed, pencarian, detail listing, dan toko dapat dibuka tanpa login. Login diperlukan untuk aksi pribadi dan transaksi. Izin lokasi perangkat tidak wajib; lokasi bisa dipilih manual. | Guest browsing dan lokasi manual diusulkan; bukan login wajib untuk seluruh pembacaan. | D-02; RFC §5, §12 | T-12, T-21, T-22 | P0 |
| Q-27 · L70 | **Usulan parameter awal:** kode 6 digit, masa berlaku 5 menit, sekali pakai, jeda kirim ulang 60 detik, serta batas percobaan dan pengiriman. Backend membuat dan memvalidasi kode; OpenWA hanya mengirim pesan. Keberhasilan pengiriman bukan bukti verifikasi nomor. | Parameter OTP dan batas frekuensi diusulkan; angka belum menjadi persetujuan produk baru. | D-10; RFC §11.2 | T-01, T-21 | P0 |
| Q-28 · L108 | Informasi toko yang diusulkan: nama, logo/foto, deskripsi, kategori usaha, lokasi, jam operasional, serta pilihan pengambilan/pengantaran. | Field profil usaha/jam/penyerahan terpetakan; tingkat wajib setiap field masih usulan. | RFC §21.3 | T-47 | P0 |
| Q-29 | Pertanyaan tambahan RFC; belum requirement PRD | Pertanyaan tambahan RFC: durasi retensi media/bukti/analytics dan akses ekspor; tidak menambah pengumpulan data tanpa batas. | RFC §13.1, §15.2, §24.1 | T-12, T-13, T-54 | P2 |
| Q-30 | Pertanyaan tambahan RFC; belum requirement PRD | Pertanyaan tambahan RFC: batas usia, barang terlarang dan aturan banding; belum merupakan aturan produk yang diputuskan. | RFC §3 | T-42, T-45 | P2 |
| Q-31 | Pertanyaan tambahan RFC; belum requirement PRD | Pertanyaan tambahan RFC: apakah harga tetap membolehkan diskon manual dari penjual; chat tidak ditutup hanya karena negotiable=false. | RFC §21.1 | T-24, T-32 | P1 |

## 5. Hubungan rekomendasi D dengan keputusan Q

| Rekomendasi RFC | Register Q | Hal yang ditinjau |
| --- | --- | --- |
| D-01 | Q-01 | Detail alamat onboarding |
| D-02 | Q-02, Q-04, Q-11, Q-26 | Radius, privacy grid, area, guest |
| D-03 | Q-12, Q-13, Q-17 | Revisi setelah kesepakatan/pembayaran |
| D-04 | Q-10, Q-11 | Katalog dengan reservasi parsial |
| D-05 | Q-15 | Batch PO |
| D-06 | Q-08 | Masa aktif kalender |
| D-07 | Q-09 | Negosiasi ketika Plus habis |
| D-08 | Q-18, Q-20 | Block, restriction dan ban |
| D-09 | Q-18, Q-20 | Akses pesan/evidence admin |
| D-10 | Q-27 | Parameter OTP |
| D-11 | Q-07, Q-18 | Format/jumlah media |
| D-12 | Q-07, Q-15, Q-16 | Satuan dan pembulatan DP |
| D-13 | Q-20, Q-22 | Hold kasus dan completion |
| D-14 | Q-05 | Penurunan batas paket |
| D-15 | Q-06 | Duplikasi/migrasi penerbit |
| D-16 | Q-16 | Bentuk tenggat DP |

## 6. Penyelesaian celah audit sebelumnya

| Celah | Pelengkapan revisi ini | Batas yang masih ada |
| --- | --- | --- |
| Metrik hanya disebut | RFC §24: sumber event, rumus, interval, cohort, dedupe, akses agregat, tes T-51–T-54 | Target bisnis, retensi pengumpulan, dan implementasi belum final |
| Field listing kurang eksplisit | RFC §21: negotiable, preferensi barter, registry kategori, atribut kendaraan, terms catering/penyerahan | Daftar kategori/field wajib final masih Q-07 |
| Pengaturan admin belum lengkap | RFC §22: API terbatas, versi/audit, UI before-after, race handling, T-48 | Perilaku penurunan limit masih D-14; harga tidak editable lewat endpoint batas |
| Revisi/refund setelah DP belum dirancang lengkap | RFC §23: proposal/consent, delta stok, saldo net, perintah refund/konfirmasi, T-49–T-50 | Hak refund, batas setelah processing, dan prioritas demo belum disetujui |
| Pengujian belum tertaut per requirement | Semua R mempunyai skenario T dan sumber PRD; RFC §17 berisi T-01–T-55 | Belum ada kode tes atau bukti kelulusan |

## 7. Penggunaan saat implementasi

Untuk setiap R yang dikerjakan, catat R-ID pada backlog/test case lalu tambahkan bukti berupa path kode, migration, nama tes/subkasus, commit, environment, dan hasil aktual. Requirement Bersyarat wajib menyebut D/Q yang dipakai; jangan memperlakukan fallback demo sebagai perilaku final produk.

Kriteria status implementasi: **Belum dibuat → Dikerjakan → Dibuat belum terverifikasi → Terverifikasi**. Kegagalan tes atau perubahan requirement membuka ulang verifikasi. Tombol/halaman yang belum terhubung backend tidak memenuhi status Terverifikasi.

Sebelum menyatakan cakupan selesai, periksa bahwa setiap R aktif mempunyai bukti positif/negatif yang relevan, Q yang memengaruhinya sudah diputuskan, dan OUT tidak diklaim tersedia. Untuk metrik, persentase **pemetaan dokumen** berbeda dari persentase **implementasi** dan persentase **tes lulus**.

Jika PRD berubah, pertahankan ID R lama; tambahkan R baru atau tandai superseded beserta penggantinya. Perbarui referensi baris/snapshot dan jalankan ulang pemeriksaan konsistensi. Tidak ada bukti penerimaan hilang karena tabel dinomori ulang.
