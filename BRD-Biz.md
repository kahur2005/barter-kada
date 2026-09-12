# Master Document: Product & Business Requirements (PRD & BRD)
**Project: "BarteTangga" - Neighborhood Hyperlocal Marketplace**

---

## 1. Ringkasan Eksekutif & Visi Produk
**BarteTangga** adalah aplikasi web berbasis *mobile-first* yang menghubungkan warga tetangga dalam radius 1-5 km untuk melakukan barter barang/jasa, berbagi hasil kebun rumahan (sayur, buah, bibit tanaman), mendonasikan perabot layak pakai (hibah/gratis), serta transaksi jual-beli kasual tanpa potongan komisi platform (0% fee)[span_0](start_span)[span_0](end_span).

### 1.1 Masalah yang Diselesaikan
*   **Tingginya Biaya & Jarak di E-commerce Konvensional:** E-commerce besar membebankan biaya admin tinggi dan ongkos kirim antarkota yang tidak masuk akal untuk komoditas bernilai kasual (misalnya segenggam cabai atau pinjam tangga bor)[span_1](start_span)[span_1](end_span).
*   **Hilangnya Kehangatan Komunitas Bertetangga:** Kurangnya platform terpercaya untuk saling menolong antartetangga yang berdekatan[span_2](start_span)[span_2](end_span).
*   **Limbah Rumah Tangga:** Barang layak pakai sering kali terbuang karena repot untuk dijual keluar lingkungan[span_3](start_span)[span_3](end_span).

### 1.2 Target Pengguna & Strategi Akuisisi
| Segmen Pengguna | Karakteristik & Kebutuhan[span_4](start_span)[span_4](end_span) | Strategi Akuisisi (Go-to-Market) |
| :--- | :--- | :--- |
| **Warga Komunitas (RT/RW)** | Individu yang ingin bertukar hasil panen kebun, perlengkapan anak, atau peralatan rumah tangga[span_5](start_span)[span_5](end_span). | Bekerja sama dengan paguyuban warga, grup WhatsApp RT/RW, dan pengurus kompleks. |
| **Pengrajin & UMKM Rumahan** | Tetangga yang memproduksi kudapan, kerajinan tangan, atau menawarkan jasa lokal sederhana[span_6](start_span)[span_6](end_span). | Pendekatan *door-to-door* ke usaha rumahan, memberikan insentif *verified badge* jika mengajak tetangga. |
| **Pencari Barang Gratis/Preloved** | Warga yang memanfaatkan prinsip sirkular ekonomi lokal[span_7](start_span)[span_7](end_span). | Kolaborasi dengan program kelestarian lingkungan atau Bank Sampah lokal. |

---

## 2. Strategi Bisnis & Monetisasi (Revenue Streams)
Karena transaksi P2P warga dijamin 0% komisi platform[span_8](start_span)[span_8](end_span), pendapatan perusahaan dihasilkan melalui ekosistem B2B (mitra lokal) dan langganan premium B2C (warga).

### A. Sponsorship "Titik Temu Aman" (B2B)
Mengubah opsi titik temu publik[span_9](start_span)[span_9](end_span) menjadi kemitraan komersial dengan minimarket/kafe lokal.
*   **Biaya Mitra:** Rp 150.000 - Rp 300.000 / bulan / titik.
*   **Fitur:** Titik lokasi mitra disematkan resmi di fitur *In-App Chat* sebagai rekomendasi utama COD. Mitra Paket Promo dapat menyematkan e-voucher otomatis (misal: Diskon Kopi).
*   **Value:** Mendatangkan *foot traffic* terjamin dari pengguna BarteTangga.

### B. Hyperlocal Native Ads (B2B)
Menyediakan slot *Promoted Listing* untuk UMKM atau jasa lokal (katering, servis AC, dll).
*   **Biaya UMKM:** Rp 10.000/hari (Radius 1-2 km) hingga Rp 20.000/hari (Radius 3-5 km).
*   **Value:** Iklan selalu berada di posisi atas pada *feed* pencarian warga di radius terdekat.

### C. Kemitraan Logistik Hyperlocal (B2B - Opsional)
Integrasi kurir instan lokal bagi pengguna yang tidak dapat melakukan *meet-up* langsung[span_10](start_span)[span_10](end_span).
*   **Model Bisnis:** *Revenue Sharing* (10% - 15% dari biaya ongkir pihak ketiga).

### D. Paket Langganan Warga "BarteTangga Plus" (B2C)
Paket premium seharga **Rp 10.000 / Bulan** yang berfokus pada efisiensi waktu, tanpa merusak ekosistem adil antartetangga.
*   **Auto-Radar & Early Access (15 Menit Pertama):** Pengguna memasang kata kunci incaran. Jika ada barang baru yang sesuai, mereka mendapat akses eksklusif 15 menit untuk menawar sebelum muncul di *feed* publik.
*   **Auto-Proposal (Tawar Otomatis):** Sistem mengirimkan pesan penawaran *template* otomatis ke *In-App Chat* pemilik listing segera setelah barang incaran terdeteksi.
*   **Multi-Anchor:** Dapat memasang hingga 2 titik domisili pencarian (misal: Rumah & Kantor) untuk memperluas jangkauan *geofencing*[span_11](start_span)[span_11](end_span).
*   **Highlight Penawaran (Gold Border):** Kartu tawaran barter (Direct Trade Offer)[span_12](start_span)[span_12](end_span) milik pengguna premium akan diberi bingkai emas agar lebih menonjol di ruang obrolan.

---

## 3. Spesifikasi Kebutuhan Fungsional (FRD)

### Modul 1: Autentikasi, Wilayah & Profil Komunitas
| ID Fitur | Nama Fitur | Kriteria Penerimaan (Acceptance Criteria)[span_13](start_span)[span_13](end_span) |
| :--- | :--- | :--- |
| **FR-01.1** | Registrasi & Login Cepat | Pengguna dapat masuk dalam waktu < 15 detik (Google OAuth/OTP)[span_14](start_span)[span_14](end_span). |
| **FR-01.2** | Set Wilayah Anchor | Sistem menyimpan koordinat titik pusat radius dengan toleransi *privacy blur* (+/- 100m)[span_15](start_span)[span_15](end_span). |
| **FR-01.3** | Profil & Reputasi | Menampilkan total transaksi selesai, ulasan bintang, dan lencana[span_16](start_span)[span_16](end_span). |

### Modul 2: Discovery Feed & Filter Hyperlocal
| ID Fitur | Nama Fitur | Kriteria Penerimaan (Acceptance Criteria)[span_17](start_span)[span_17](end_span) |
| :--- | :--- | :--- |
| **FR-02.1** | Feed Berbasis Radius | Pengguna mengatur slider jarak instan (0.5 km hingga maks 5 km)[span_18](start_span)[span_18](end_span). |
| **FR-02.2** | Segmentasi Tipe | Filter instan: Barter Murni, Gratis/Hibah, Jual Kasual[span_19](start_span)[span_19](end_span). |
| **FR-02.3** | Kategori Komunitas | Penelusuran per kategori (Panen Kebun, Dapur, Perkakas, dll)[span_20](start_span)[span_20](end_span). |

### Modul 3: Manajemen Listing & Barter Wishlist
| ID Fitur | Nama Fitur | Kriteria Penerimaan (Acceptance Criteria)[span_21](start_span)[span_21](end_span) |
| :--- | :--- | :--- |
| **FR-03.1** | Pembuatan Listing | Maks 3 foto, kompresi sisi klien otomatis di bawah 400KB[span_22](start_span)[span_22](end_span). |
| **FR-03.2** | Field "Dicari untuk Ditukar" | Wajib diisi untuk tipe Barter, muncul dengan tag khusus di kartu produk[span_23](start_span)[span_23](end_span). |
| **FR-03.3** | Siklus Status Barang | Listing berstatus Selesai otomatis disembunyikan dari feed setelah 24 jam[span_24](start_span)[span_24](end_span). |

### Modul 4: Mesin Negosiasi & In-App Chat P2P
| ID Fitur | Nama Fitur | Kriteria Penerimaan (Acceptance Criteria)[span_25](start_span)[span_25](end_span) |
| :--- | :--- | :--- |
| **FR-04.1** | In-App Real-time Chat | Pesan real-time tanpa mengekspos nomor HP[span_26](start_span)[span_26](end_span). |
| **FR-04.2** | Tombol Ajukan Barter | Penawar dapat mengajukan listing miliknya sebagai kompensasi tukar guling (kartu interaktif di chat)[span_27](start_span)[span_27](end_span). |
| **FR-04.3** | Titik Temu Aman | Pilihan template lokasi publik (Pos Satpam, Balai Warga) yang disepakati bersama[span_28](start_span)[span_28](end_span). |

### Modul 5: Ulasan, Penyelesaian & Moderasi
| ID Fitur | Nama Fitur | Kriteria Penerimaan (Acceptance Criteria)[span_29](start_span)[span_29](end_span) |
| :--- | :--- | :--- |
| **FR-05.1** | Konfirmasi Penyelesaian | Aksi ganda "Barter Selesai" untuk menutup transaksi dan menambah reputasi[span_30](start_span)[span_30](end_span). |
| **FR-05.2** | Penilaian (Neighbor Rating) | Ulasan 1-5 bintang beserta pilihan tag sikap (cth: "Ramah", "Tepat Waktu")[span_31](start_span)[span_31](end_span). |
| **FR-05.3** | Pelaporan & Moderasi | Tombol laporan yang terhubung ke dashboard pengawas untuk indikasi barang terlarang/tindakan tidak sopan[span_32](start_span)[span_32](end_span). |

---

## 4. Arsitektur Teknis & Skema Data Utama

**Standar Sistem:**
*   **Platform:** Web Responsif (Dioptimalkan Chrome Mobile & Safari iOS, mendukung PWA)[span_33](start_span)[span_33](end_span).
*   **Mekanisme Lokasi:** HTML5 Geolocation API (Geofencing) & toleransi radius privasi[span_34](start_span)[span_34](end_span).

**Skema Data Model (Data Model Essentials)[span_35](start_span)[span_35](end_span):**
```sql
[User]
- id (UUID)
- name (String)
- phone/email (String)
- location_lat / location_lng (Float)
- neighborhood_name (String)
- reputation_score (Float)
- is_premium (Boolean, default: false) -- Tambahan untuk BarteTangga Plus
- created_at (Timestamp)

[Listing]
- id (UUID)
- user_id (FK -> User)
- title, description, category (String)
- trade_type (Enum: BARTER, FREE, CASUAL_SALE)
- wanted_exchange (String)
- status (Enum: AVAILABLE, PENDING, COMPLETED)
- geo_lat / geo_lng (Float)
- is_promoted (Boolean, default: false) -- Tambahan untuk Native Ads

[Trade_Proposal]
- id (UUID)
- listing_id (FK -> Listing)
- proposer_id (FK -> User)
- offered_listing_id (FK -> Listing)
- status (Enum: OFFERED, ACCEPTED, REJECTED, COMPLETED)

[ChatMessage]
- id (UUID)
- conversation_id (UUID)
- sender_id (FK -> User)
- message_text (Text)
- proposal_id (FK -> Trade_Proposal)
- sent_at (Timestamp)
