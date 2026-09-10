# PDR-001 — Desain produk Barter

Versi: 0.1 — usulan desain untuk ditinjau
Tanggal: 11 September 2026
Platform utama: web mobile; desktop tetap didukung
Acuan: [PRD v1.3](PRD.md), [RFC-001 v1.1](RFC-001-arsitektur-barter.md), dan [matriks cakupan](RFC-001-matriks-cakupan.md).

## 1. Tujuan dan kedudukan dokumen

Project Design Requirements ini menerjemahkan kebutuhan Barter menjadi arah visual, susunan halaman, komponen, perilaku interaksi, dan kriteria penerimaan desain. Pembaca utamanya adalah perancang UI dan pengembang React yang akan mengimplementasikan produk di Vercel dengan backend Supabase.

Brief pengguna: terasa seperti Craigslist atau situs classified sejenis, dengan pengguna mobile sebagai prioritas. Hasil yang dituju adalah **papan penawaran lingkungan yang cepat dipindai**, bukan etalase e-commerce dengan checkout atau media sosial dengan konten viral.

Dokumen ini belum merupakan desain yang disetujui, implementasi, atau bukti uji aplikasi. Aturan bisnis mengikuti PRD; mekanisme server mengikuti RFC. Token, layout, urutan formulir, dan pilihan UI di sini adalah usulan desain. Keputusan D/Q yang terbuka pada RFC/matriks tetap terbuka. Bila ada konflik, revisi dokumen terkait secara eksplisit sebelum implementasi; jangan mengubah aturan bisnis hanya agar cocok dengan mockup.

## 2. Arah desain dan referensi

### 2.1 Pendekatan yang dipilih untuk draft

| Pendekatan | Keuntungan | Trade-off |
| --- | --- | --- |
| **Classified mobile dengan thumbnail — direkomendasikan** | Judul, harga, area, dan bentuk penawaran cepat dibandingkan; foto membantu menilai barang/makanan | Tidak sevisual katalog foto besar; perlu disiplin hierarki teks |
| Direktori teks hampir sepenuhnya | Sangat ringan dan dekat dengan pola direktori klasik | Kondisi preloved dan menu makanan lebih sulit dinilai sebelum membuka detail |
| Grid foto ala marketplace modern | Menonjolkan produk secara visual | Lebih sedikit konteks per layar kecil; jadwal PO, barter, dan harga mudah terpotong |

Draft memakai pendekatan pertama. Struktur kategori dan tautan langsung mendapat inspirasi dari halaman [Craigslist Indonesia](https://www.craigslist.org/area/jakarta), yang mengelompokkan penawaran dalam direktori seperti for sale, barter, furniture, dan free. Referensi ditinjau 11 September 2026. Palet, ukuran, dan komponen di bawah adalah rancangan Barter sendiri, bukan pengukuran atau salinan pixel-perfect situs tersebut.

### 2.2 Prinsip visual

- Konten mulai segera: header ringkas, pencarian, kategori, kemudian listing. Tidak ada hero marketing, carousel promosi besar, atau onboarding slide sebelum pengguna melihat barang.
- Latar putih, section abu-abu ringan, judul tautan ungu-indigo, foto barang asli. Wordmark berupa teks “barter”; tidak memakai logo atau aset Craigslist.
- Daftar satu kolom adalah tampilan baku. Baris dipisahkan garis halus, bukan semua elemen dibungkus kartu mengambang.
- Kepadatan informasi tidak berarti teks kecil: isi penting tetap 16 px, kontrol sentuh minimal 48 px.
- Identitas tetangga/usaha, area perkiraan, dan kondisi barang lebih penting daripada lencana dekoratif.
- Satu tindakan utama per tahap. Status selalu menjawab “sekarang apa, siapa yang perlu bertindak, dan apa langkah berikutnya”.
- Tidak ada gradient dekoratif, glass effect, video autoplay, penghitung urgensi palsu, atau pop-up Plus saat membuka aplikasi.

### 2.3 Kebutuhan pengguna yang dilayani

| Pengguna/konteks | Pekerjaan utama | Dampak desain |
| --- | --- | --- |
| Warga mencari barang dekat rumah | Menemukan barang sesuai harga, jarak, dan kondisi | Cari dan area selalu mudah ditemukan; list ringkas berfoto |
| Ibu rumah tangga menjalankan catering/PO | Memasang menu dan memproses pesanan tanpa belajar sistem kasir | Form bertahap, bahasa sehari-hari, subtotal/DP otomatis, antrean perlu tindakan |
| Pemilik barang pribadi | Menjual, barter, atau memberi tanpa membuat toko | Pasang lewat profil adalah jalur awal; tidak dipaksa membeli Plus |
| Dua pihak saat bertemu | Memeriksa barang dan mengonfirmasi tanpa salah klik | Ringkasan kesepakatan, tombol besar, konfirmasi penerimaan yang jelas |
| Admin menangani laporan | Membandingkan kesepakatan dengan bukti dan keputusan | Riwayat terstruktur, akses terbatas per kasus, alasan keputusan wajib |

## 3. Fondasi visual

### 3.1 Token warna

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `paper` | `#FFFFFF` | Latar halaman, field, teks tombol utama |
| `surface` | `#F3F4F6` | Section header, panel ringkasan, skeleton statis |
| `ink` | `#202124` | Judul, harga, isi utama |
| `muted` | `#5F6368` | Metadata, helper text, border kontrol |
| `action` | `#3730A3` | Tautan, tombol utama, penanda aktif, focus ring |
| `danger` | `#B42318` | Error, tindakan destruktif, masalah yang perlu perhatian |

Divider dekoratif boleh memakai `muted` dengan opacity 20%; jangan memakai divider tersebut sebagai satu-satunya batas input atau penanda fokus. Border input memakai `muted` penuh. Teks/status tidak dibuat transparan demi estetika. Status sukses menggunakan ikon centang dan kata “Selesai”, bukan membutuhkan warna tambahan. Label promosi memakai teks `ink` pada `surface`.

Kontras matematis token penuh: `ink/paper` 16,10:1; `muted/paper` 6,05:1; `action/paper` 9,93:1; `danger/paper` 6,57:1. Nilai terendah teks pada `surface` adalah `muted/surface` 5,50:1. Ini pemeriksaan pasangan warna, bukan sertifikasi aksesibilitas antarmuka.

### 3.2 Tipografi dan ukuran

- Font utama: system UI (`system-ui`, `Segoe UI`, sans-serif). Tidak memerlukan unduhan font agar halaman berguna.
- Judul halaman: 24/30 px, bobot 700; heading section: 18/26 px, 600.
- Judul listing: 16/22 px, 600, warna `action`; detail menampilkan nama lengkap.
- Body dan input: 16/24 px, 400; label/tombol: 16/22 px, 600.
- Metadata: 14/20 px. Label navigasi: 12/16 px, hanya untuk lima label pendek; jangan gunakan ukuran ini untuk harga, tenggat, atau ketentuan transaksi.
- Harga utama: 18/24 px, 700; angka uang pada rincian memakai tabular numerals dan rata kanan.
- Spacing: 4, 8, 12, 16, 24, 32 px. Gutter mobile 16 px; 12 px pada lebar 320 px.
- Radius: 4 px untuk field/tombol/thumbnail, 8 px untuk dialog. Avatar boleh bulat. Tidak semua label menjadi pill.
- Kontrol utama minimum tinggi 48 px. Ikon 20–24 px di dalam area sentuh 48 × 48 px.
- Motion hanya transisi status/panel 120–180 ms; hormati reduced motion. Tidak ada animasi perayaan saat pembayaran manual.

### 3.3 Foto dan ikon

Thumbnail list 80 × 80 px pada mobile standar, 64 × 64 px pada 320 px. Rasio 1:1 dengan crop; detail menyediakan gambar penuh tanpa memotong bukti kondisi. Container foto tidak boleh melompat ketika gambar selesai dimuat. Tampilkan placeholder “Foto tidak tersedia” saat gagal, sementara judul/harga tetap dapat dibuka.

Pakai satu keluarga ikon outline yang konsisten; seluruh aksi penting tetap memiliki label teks. Foto ilustrasi/data contoh wajib ditandai pada demo. Jangan menghasilkan foto contoh lalu menyajikannya sebagai barang pengguna nyata.

## 4. Layout mobile dan responsive

### 4.1 Ukuran acuan

| Lebar viewport | Layout |
| --- | --- |
| 320–359 px | Satu kolom, gutter 12 px, thumbnail 64 px; filter boleh membungkus |
| 360–767 px | Satu kolom, gutter 16 px, thumbnail 80 px; acuan desain utama 390 × 844 px |
| 768–1023 px | Shell maksimum 960 px; daftar utama tetap satu kolom; form/ruang transaksi maksimum 720 px |
| ≥1024 px | Shell maksimum 1200 px; sidebar filter 224 px, gap 24 px, list fleksibel; detail dapat dua kolom |

Jangan memperbesar mobile menjadi grid kartu tiga kolom secara otomatis. Desktop tetap mempertahankan karakter direktori. Pada desktop, penawaran barter dapat berdampingan; pada mobile keduanya ditumpuk dalam satu halaman, bukan disembunyikan di tab terpisah.

### 4.2 Shell dan navigasi

- Header dasar minimum 56 px: wordmark, pilihan area ringkas, notifikasi. Nama area panjang harus wrap atau dipendekkan dengan nama lengkap tersedia secara aksesibel.
- Home menyediakan baris pencarian minimum 48 px tepat setelah header. Header/filter ikut scroll; hanya navigasi bawah yang menetap agar ruang konten tidak terjepit.
- Navigasi bawah mobile: **Beranda · Cari · Pasang · Pesan · Akun**, tinggi minimum 64 px ditambah safe-area. Ikon dan label aktif memakai garis/teks tebal, bukan warna saja.
- “Pasang” adalah tautan menuju form, bukan tombol mengambang yang menutupi hasil. “Toko sekitar” adalah tab penemuan di home/search, bukan navigasi utama keenam.
- Desktop memindahkan navigasi utama ke header. Jangan menampilkan navigasi bawah dan navigasi desktop bersamaan.
- Detail, form, ruang chat, dan transaksi mengganti navigasi bawah dengan satu area tindakan kontekstual. Header menyediakan Kembali; perpindahan halaman mempertahankan state asal.
- Padding bawah konten mengikuti tinggi aktual sticky action/composer dan safe-area. Saat keyboard muncul, field/composer dan tombol relevan tidak boleh tertutup; tidak menumpuk tab bar di bawah keyboard.
- Sheet/filter memiliki judul, tombol Tutup, focus trap, dan pengembalian fokus. Jangan mengandalkan swipe untuk menutup. Dialog yang panjang scroll secara internal tanpa menyembunyikan tindakan penting.

### 4.3 Peta halaman

| Kelompok | Rute/rancangan akses | Isi utama |
| --- | --- | --- |
| Penemuan | `/`, `/search`, `/stores` | Feed, filter, hasil produk/toko |
| Detail publik | `/listings/:id`, `/stores/:slug` | Barang atau profil usaha dan katalog |
| Masuk dan onboarding | Auth flow; `/onboarding` | Google/email, profil, lokasi, OTP; URL auth final mengikuti routing implementasi |
| Kelola penawaran | `/listings/new`, `/my/listings`, `/my/stores` | Form, daftar milik sendiri, katalog toko |
| Percakapan | Daftar Pesan; `/chat/:id` | Inbox, chat per listing, kartu transaksi |
| Kesepakatan | `/transactions/:id` | Barter atau pesanan dengan snapshot dan riwayat |
| Akun | `/profile`, `/plus`, `/notifications` | Data sendiri, transaksi saya, paket, pemberitahuan |
| Moderasi | `/admin/reports`, `/admin/reports/:id`, `/admin/settings/limits` | Antrean kasus, keputusan, batas listing/produk |

URL untuk daftar Pesan, transaksi saya, profil publik, dan auth belum ditetapkan RFC; tentukan saat routing tanpa menciptakan alur produk berbeda. Setiap halaman detail harus dapat dibuka lewat deep link dan menjalankan pemeriksaan akses yang sama dengan navigasi biasa.

## 5. Penemuan: home, pencarian, dan lokasi — UI-01

Urutan mobile: area → search → tab Barang/Toko sekitar → kategori → filter/urut → hasil. Kategori berupa tautan teks dalam direktori dua kolom pendek, bukan ikon ilustrasi besar. Draft kategori: Makanan, Pakaian, Rumah & furnitur, Kendaraan, Kebun, Lainnya. Ini contoh UI, bukan pengesahan taxonomy final (Q-07). PO/catering adalah filter bentuk pemenuhan, barter/gratis adalah mode; jangan dicampur menjadi kategori data.

Wireframe home (contoh konten fiktif; tidak menyatakan jumlah hasil aktual):

```text
barter       Depok · 5 km v      [Notif]
[ Cari barang, makanan, atau toko     ]
 Barang              Toko sekitar
--------------------------------------
Makanan              Pakaian
Rumah & furnitur     Kendaraan
Kebun                Semua kategori
--------------------------------------
[Filter (2)]         Urut: Terbaru v
Penawaran di sekitar
[foto] Kursi kayu bekas
       Rp150.000 · Bisa ditawar
       Beji · sekitar 2 km · Pribadi
--------------------------------------
[foto] Nasi kotak Dapur Bu Rina
       Mulai Rp10.000/pcs · PO
       Tutup 12 Sep · Ambil 13 Sep
       Beji · sekitar 3 km · Toko
--------------------------------------
[foto] Bibit cabai
       Gratis
       Kukusan · sekitar 2 km
...
[Tampilkan lagi]
Beranda   Cari   Pasang   Pesan   Akun
```

Setiap baris berisi judul maksimal dua baris, harga/mode, area dan jarak perkiraan, serta identitas Pribadi atau nama toko. PO menambahkan batas pemesanan dan tanggal tersedia; harga “Mulai” dipakai bila ada perbedaan harga varian. Jangan menyembunyikan syarat minimum sebagai harga promo. Detail selalu menampilkan syarat lengkap.

Persyaratan interaksi:

- Search memakai submit yang jelas dan mempertahankan query saat kembali dari detail. Filter: kategori, radius, harga minimum/maksimum, mode, bentuk pemenuhan; urut relevansi/terbaru/terdekat. Usulan default home Terbaru dan pencarian berquery Relevansi; perlu ditinjau bersama desain.
- Filter mobile membuka sheet berisi label, nilai terpilih, Reset, Terapkan. Badge filter menunjukkan jumlah filter non-default; reset tidak diam-diam mengganti area yang dipilih.
- State query/filter/tab/scroll disimpan sepanjang navigasi kembali. Perubahan filter memulai hasil dari awal; jangan mencampurkan halaman hasil lama dan baru.
- Baseline pagination tombol “Tampilkan lagi”, mengikuti page backend; hindari infinite scroll yang terus menggeser posisi atau footer. Bila total tidak disediakan backend, jangan membuat angka total.
- Promosi memiliki label **Dipromosikan** yang terlihat sebelum membuka detail; format/ukuran baris sama dengan organik. Maksimum satu dari 10 listing, tunduk filter/radius/ketersediaan. Tidak ada produk duplikat dalam halaman yang sama.
- Lokasi awal 5 km. Pilihan perluasan radius memakai konfigurasi yang disepakati, bukan angka hardcoded dari mockup (Q-02). Tidak memperluas otomatis saat hasil kosong.
- Area picker menyediakan pilihan wilayah manual sebagai usulan Q-26; “Gunakan lokasi perangkat” meminta izin setelah disentuh. Tolak izin tidak menghasilkan loop prompt.
- Tampilkan area perkiraan dan jarak dibulatkan dari projection publik. Tidak ada pin rumah presisi, koordinat di tooltip/URL/HTML, atau jarak presisi melalui filter. Peta bukan syarat agar feed berguna.
- Di luar area penerbitan: jelaskan “Saat ini penawaran tersedia di Jabodetabek, selain Kepulauan Seribu.” Akses akun luar wilayah mengikuti Q-02; jangan memblokir akun berdasarkan dugaan domisili.
- Empty: “Belum ada penawaran yang cocok” + Ubah filter/Ubah area. Loading memakai baris skeleton statis; error menggunakan Coba lagi tanpa menghapus filter.

## 6. Detail listing dan profil toko — UI-02

Detail listing berurutan: Kembali → foto dengan penghitung → nama → harga/mode → kondisi/kekurangan → ketentuan khusus → area perkiraan → penerbit/reputasi → penyerahan → Laporkan listing. Foto tidak menjadi hero setinggi layar; acuan gambar awal rasio 4:3, dapat dibuka penuh dengan tombol tutup dan berikut/sebelumnya yang berlabel.

| Penawaran | Informasi sebelum CTA | CTA utama |
| --- | --- | --- |
| Jual | Harga, bisa/tidak bisa ditawar, kondisi dan kekurangan | Chat penjual |
| Barter | Barang yang dicari/terbuka tawaran, kondisi | Ajukan barter |
| Jual atau barter | Harga dan preferensi barter | Chat penjual; Ajukan barter sebagai aksi kedua setara terlihat |
| Gratis | Harga barang Gratis, jumlah, penyerahan dan kemungkinan ongkir terpisah | Hubungi pemberi |
| PO | Harga/satuan/varian, minimum, batas PO, tersedia kapan, kuota, DP jika ada | Tanya pesanan |
| Catering | Menu/paket, minimum, waktu persiapan, area layanan, ketersediaan perlu dikonfirmasi | Tanya pesanan |

CTA membuka chat/ruang tawaran; **bukan checkout dan bukan pembayaran**. Guest/incomplete profile melewati gate akun lalu kembali ke konteks asal tanpa mengirim pesan atau persetujuan otomatis. Detail milik sendiri menampilkan Kelola listing, bukan mengizinkan transaksi dengan diri sendiri.

Status tidak tersedia/reserved/PO tutup menjelaskan alasan dan meniadakan kesepakatan baru; peserta lama tetap mendapat Buka transaksi. Listing yang dihapus/disembunyikan menampilkan pesan generik pada publik tanpa membocorkan alasan privat moderasi.

Profil toko: nama/foto → deskripsi singkat → reputasi toko → area dan jam → pilihan penyerahan → katalog dengan pencarian/filter sederhana sesuai kebutuhan katalog. Tidak memerlukan cover banner. Alamat lengkap tampil hanya bila toko secara eksplisit opt-in; tidak membuka alamat toko lain milik akun yang sama. Katalog memakai komponen list yang sama dengan feed tanpa mengarang promosi pada halaman toko.

Badge “Nomor terverifikasi” menjelaskan verifikasi kepemilikan nomor, bukan “Penjual dijamin aman”. Plus menandakan langganan, bukan tingkat kepercayaan. Rating tanpa ulasan ditulis “Belum ada ulasan”, bukan 0 bintang.

## 7. Masuk, profil, dan OTP — UI-03

Usulan guest browsing mengikuti Q-26. Masuk menawarkan Lanjutkan dengan Google atau email/password; jangan menambahkan login nomor/password yang tidak ditetapkan PRD. Nama dan WhatsApp dikumpulkan saat melengkapi profil, bukan diminta berulang pada login.

Onboarding ditampilkan sebagai tiga bagian pendek dengan progress teks: Data diri → Lokasi → Verifikasi WhatsApp. Nama dari Google dapat ditinjau; pengguna Google tidak diminta membuat password. Email dan nomor diberi helper “Tidak ditampilkan di profil publik”. Pisahkan area publik dari detail alamat privat. Keputusan wajib/tidak wajib detail jalan mengikuti Q-01.

Form OTP memakai satu input semantik yang dapat paste kode lengkap, numeric keyboard, dan autocomplete kode; boleh divisualkan bersegmen tanpa enam fokus terpisah. Nomor tujuan dimasking, tersedia Ubah nomor, status pengiriman, waktu kirim ulang dari server, error salah/kedaluwarsa, dan status gangguan pengiriman. Parameter mengikuti Q-27. Jangan menampilkan “Terverifikasi” hanya karena pesan berhasil dikirim.

Nomor sudah dipakai tidak otomatis menautkan akun dan tidak mengungkap pemiliknya. Jalur pemulihan/reset password dan OTP gagal harus dirancang sebelum auth dinyatakan lengkap; jangan menawarkan fallback SMS yang belum tersedia (Q-03). Setelah sesi kedaluwarsa, login ulang mengembalikan konteks tanpa mengeksekusi tindakan sensitif sebelumnya.

## 8. Pasang dan kelola listing — UI-04

Wizard usulan, satu kolom dengan label permanen:

1. **Penawaran:** penerbit default Profil pribadi; pilihan toko hanya milik sendiri dan berhak aktif. Pilih Jual/Barter/Jual atau barter/Gratis, kategori, lalu ready stock/PO/catering sesuai kombinasi yang diizinkan kontrak RFC. Kombinasi tidak valid diberi alasan, bukan diterbitkan lalu gagal tanpa petunjuk.
2. **Detail:** nama, foto, deskripsi, kondisi/kekurangan, field kategori, preferensi barter, harga/negotiable dan varian yang relevan. Unggah punya progress per foto, retry, hapus, pilih foto utama. Syarat format/batas mengikuti konfigurasi/Q-07.
3. **Ketersediaan dan penyerahan:** lokasi sesuai penerbit; kuantitas/kuota; untuk makanan minimum/satuan, tenggat/jadwal, DP dan pelunasan; metode serah terima serta area layanan. Harga/satuan harus terlihat bersama, bukan input angka tanpa konteks.
4. **Tinjau:** preview publik dan penanda data privat, validasi final, Simpan draft/Terbitkan. Menampilkan bahwa penawaran valid terbit langsung, bukan “Menunggu admin”.

Simpan draft tersedia sebelum langkah akhir. Back mempertahankan isian; keluar dengan perubahan belum tersimpan meminta Simpan draft atau Buang perubahan. Kegagalan upload tidak menghapus teks. Kesalahan server ditautkan ke field/step terkait dan dibawa ke fokus dengan ringkasan error.

Pilihan toko untuk akun dasar mengarah ke informasi Plus dengan jalur jelas “Lanjut lewat profil pribadi”. PO/catering **tidak dipaywall**. Kendaraan dapat menjelaskan kelengkapan dokumen tanpa meminta upload nomor identitas/dokumen sensitif secara publik.

Kelola listing menampilkan tab Aktif/Draft/Arsip/Selesai dan counter dari server “12 dari 20 aktif”; angka batas bukan konstanta UI. Label “Dipesan” tetap dihitung aktif. Tindakan Edit/Arsip pada barang eksklusif reserved dinonaktifkan dengan alasan serta tautan transaksi. PO berkuota tidak otomatis dikunci seluruhnya oleh satu pesanan; aturan edit mengikuti D-04/Q-10. Penghapusan visibilitas tidak menghapus bukti transaksi.

## 9. Chat dan kartu kesepakatan — UI-05

Inbox: nama lawan, thumbnail/nama listing, pesan/status terakhir, waktu, unread; toko terkait selalu dibedakan. Satu pasangan/listing punya satu chat. Header chat memuat penerbit, listing, menu Blokir/Laporkan. Riwayat pesan dapat dimuat lebih lama tanpa kehilangan posisi baca.

Chat menampilkan pesan teks/foto, waktu, Terkirim/Dibaca, serta kartu sistem untuk tawaran/pesanan. Tidak menyediakan edit/unsend, panggilan, atau pengalihan transaksi ke WhatsApp. Composer foto memperlihatkan preview sebelum Kirim. Mengirim foto bukti transfer tidak mengubah status pembayaran otomatis.

Tiap kartu transaksi mempunyai ID singkat, versi kesepakatan, status, ringkasan, dan Buka detail. Order ulang tidak menimpa kartu lama. Composer menampilkan konteks “Pesanan #PO-104” atau “Percakapan umum”; pemisahan bukti admin mengikuti D-09, bukan akses seluruh inbox.

Tombol tindakan penjual seperti Buat ringkasan pesanan tersedia sesuai konteks. Pembeli tidak melihat tombol pengakuan uang diterima milik penjual. Saat reconnect, tampilkan sinkronisasi; update baru tidak menggulir paksa ketika pengguna membaca riwayat. Sediakan indikator “Pesan baru”.

## 10. Ruang barter — UI-06

Tujuan: kedua orang memahami **paket yang sama** sebelum menyetujui, termasuk semua barang, kondisi, tambahan uang, dan versi.

```text
< Barter dengan Dita          [Menu]
Tawaran versi 3 · Belum disepakati
--------------------------------------
Penawaranmu                  Belum siap
[foto] Jaket denim · 1 buah
       Ukuran M · noda di lengan
[Lihat detail] [Ubah] [+ Tambah barang]
--------------------------------------
Penawaran Dita                    Siap
[foto] Rak buku · 1 buah
       Ada goresan di sisi kanan
[Lihat detail]
--------------------------------------
Tambahan uang: kamu bayar Rp50.000
Dibayar langsung saat bertemu,
setelah memeriksa barang.
--------------------------------------
Perubahan terakhir: foto rak diperbarui
Status siap kedua pihak direset saat
tawaran berubah. Tinjau versi terbaru.
[Riwayat perubahan] [Buka chat]
--------------------------------------
Periksa seluruh paket sebelum lanjut.
[                Siap                ]
```

“Penawaranmu” selalu pertama pada mobile, tetapi snapshot/versi sama untuk kedua peserta. Kedua panel menampilkan nama pihak, jumlah barang, status kesiapan/persetujuan; rincian panjang boleh expandable, ringkasan dan kekurangan penting tidak hilang. Sumber barang: Pilih listing sendiri atau Tambah barang di sini, disertai “Tidak dipasang ke publik”.

| Kondisi aktor dan tawaran aktif | Aksi/status bawah | Perilaku |
| --- | --- | --- |
| Salah satu paket belum lengkap | Siap belum tersedia + alasan | Masing-masing perlu minimal satu barang lengkap |
| Paket lengkap, kamu belum siap | Siap | Menyatakan siap untuk versi aktif, belum persetujuan final |
| Kamu siap, lawan belum siap | Menunggu pihak lain siap | Tidak menampilkan Setujui aktif |
| Kedua siap, kamu belum setuju | Setujui barter | Buka konfirmasi paket/uang/versi, lalu kirim ke server |
| Kamu setuju, lawan belum setuju | Menunggu persetujuan pihak lain | Belum Disepakati dan belum menjanjikan reservasi |
| Kedua setuju dan reservasi berhasil | Disepakati · Atur pertemuan | Tampilkan langkah inspeksi dan penerimaan |
| Isi berubah sebelum kesepakatan | Tawaran diperbarui · Tinjau ulang | Reset semua status siap/setuju; tandai apa yang berubah |
| Barang keburu direservasi transaksi lain | Barang tidak tersedia | Tidak menyatakan berhasil; tampilkan konflik dan opsi meninjau tawaran |

Tambahan uang hanya satu arah; tulis pembayar dan penerima eksplisit, tidak memakai angka bertanda +/- saja. Tidak ada DP. Konfirmasi final menampilkan paket kedua pihak, nominal/arah uang, dan versi. Tombol pending terkunci dari klik ganda; respons server menentukan hasil. Pembaruan versi saat dialog terbuka membatalkan kemampuan menyetujui versi lama.

Setelah Disepakati: Tinjau kesepakatan → Atur pertemuan lewat chat → Periksa barang → Barang sudah diterima. Dialog penerimaan menyebut barang yang diterima dan “Saya sudah memeriksa dan menerima barang ini”. Penerima topup punya aksi terpisah Uang tambahan diterima. Selesai hanya ketika semua penerimaan wajib tercatat. Tidak otomatis membuka alamat rumah.

Edit setelah Disepakati mengikuti Q-13/D-03, belum dianggap alur final. Tampilan harus mempertahankan versi disepakati/reservasi selama usulan revisi; jangan mengaktifkan editor biasa yang melepaskan barang sepihak.

## 11. Pesanan jual beli, gratis, catering, dan PO — UI-07

Ringkasan dibuat penjual/pemberi dalam chat, ditinjau pembeli/penerima di halaman transaksi. Tidak ada keranjang lintas penjual, checkout marketplace, saldo, atau pembayaran barang kepada Barter.

### 11.1 Ringkasan sebelum konfirmasi

Tampilkan penerbit dan lawan transaksi, barang/varian/jumlah/satuan, subtotal setiap baris, ongkir terpisah, total, DP jika ada, sisa, waktu pelunasan, jadwal/cara penyerahan, alamat privat yang sengaja dibagikan, dan ketentuan pembatalan. Ongkir belum diketahui menghalangi konfirmasi, bukan diperlakukan Rp0. Waktu menggunakan format eksplisit lokal, misalnya “12 Sep 2026, 18.00 WIB”; hitung mundur bukan satu-satunya penanda.

Wireframe PO dari perspektif pembeli, setelah pesanan dikonfirmasi:

```text
< Pesanan #PO-104       Dapur Bu Rina
Disepakati · versi 1
Pembayaran: Menunggu DP
Pengerjaan: Belum diproses
--------------------------------------
Nasi ayam   6 pcs × Rp10.000   Rp60.000
Nasi telur  4 pcs × Rp10.000   Rp40.000
Subtotal                    Rp100.000
Ongkir                            Rp0
Total                       Rp100.000
DP 50%                       Rp50.000
Sisa pelunasan               Rp50.000
--------------------------------------
Bayar DP sebelum 12 Sep, 18.00 WIB
Ambil 13 Sep, 11.00 WIB
Pelunasan: saat serah terima
[Lihat ketentuan pembatalan]
--------------------------------------
Bayar langsung ke penjual sesuai chat.
Penjual mengonfirmasi uang diterima.
[             Buka chat              ]
```

Pada contoh yang sama, penjual melihat **Konfirmasi DP diterima**, bukan tombol membayar. Dialog berbunyi “Sudah menerima DP Rp50.000 dari [nama] untuk pesanan #PO-104?” dan menjelaskan penjual harus memeriksa uang masuk. Aksi ini mencatat pengakuan penjual; bukan hasil pemeriksaan bank oleh Barter. Label nominal selalu berasal dari snapshot/server.

### 11.2 Kondisi per jenis

- Jual: harga akhir dan penyerahan disepakati pembeli, lalu reservasi; penjual mengonfirmasi uang diterima dan barang diserahkan, pembeli mengonfirmasi barang diterima.
- Gratis: tulis Barang Rp0/Gratis; ongkir jika ada terpisah. Pemberi memilih penerima, bukan badge “Siapa cepat dia dapat”. Kuantitas yang bisa dibagi menampilkan alokasi yang diizinkan. Konfirmasi ongkir mengikuti Q-14.
- Catering: tanggal kebutuhan, lead time, menu, area layanan; copy “Ketersediaan dikonfirmasi penjual”, bukan jaminan slot otomatis.
- PO: minimum total lintas varian dalam satuan yang dapat dijumlahkan; kuota bersama/per varian terbaca. Jika kuota tidak cukup saat konfirmasi, simpan input dan minta penyesuaian; jangan membuat order parsial tanpa persetujuan.
- Tanpa DP: tidak membuat tahap pembayaran DP kosong. DP wajib: Diproses belum tersedia sebelum DP diterima. DP 100% berarti sisa Rp0; tidak meminta pelunasan kedua.
- Lewat tenggat DP tanpa pengakuan: **Perlu pemeriksaan pembayaran**, penjelasan kuota masih ditahan; tidak memakai label Dibatalkan/Kedaluwarsa pesanan secara otomatis.
- Pembayaran dan pengerjaan selalu dua status: “DP diterima · Sisa Rp50.000” dapat bersamaan dengan “Siap diambil”. Siap bukan Lunas atau Selesai.
- Penyerahan mengikuti pengambilan/pertemuan/pengantaran yang disepakati; tidak menampilkan peta kurir, estimasi live, atau tombol pesan kurir.
- Selesai setelah pengakuan pembayaran dan serah terima yang diwajibkan lengkap. Pihak yang belum bertindak disebut jelas, tanpa auto-complete berbasis waktu.

### 11.3 Perubahan, pembatalan, dan pengembalian

Sebelum mengonfirmasi perubahan, tunjukkan perbandingan versi lama/baru: barang, jumlah, jadwal, ongkir, total, DP, selisih. Jangan mengubah riwayat “DP diterima” menjadi belum dibayar karena harga berubah. RFC §23 merancang amend/refund; Q-12/Q-17 masih harus diputuskan sebelum alur ini dianggap final.

Pembatalan selalu beralasan. Sebelum Diproses, tampilkan Batalkan pesanan bila aturan server mengizinkan; setelah Diproses, Ajukan pembatalan kepada penjual. Uang yang sudah diterima harus tetap tercatat dan kewajiban pengembalian tidak boleh disimpulkan otomatis. Tampilkan “Pengembalian dilakukan langsung antar pihak”, bukan “Dana akan masuk dalam 1–3 hari”.

## 12. Akun, toko Plus, dan langganan — UI-08

Akun menyediakan profil/verifikasi, Listing saya, Toko saya, Transaksi saya, Plus, notifikasi, bantuan/laporan terkait, dan Keluar. Transaksi saya memisahkan status Perlu tindakan/Berjalan/Selesai tanpa menganggap seluruh pengguna hanya pembeli atau hanya penjual; baris menyebut peran dan identitas penerbit.

Toko saya menampilkan maksimum tiga toko, lokasi, visibilitas, dan counter produk aktif masing-masing. Create/edit profil mengikuti Q-28; pengaturan “Tampilkan alamat lengkap usaha ke publik” default mati, dengan preview publik dan konsekuensi sebelum disimpan. Jam operasional tidak otomatis membatalkan pesanan di luar jam.

Halaman Plus menjelaskan Rp20.000/bulan, maksimum tiga toko, hingga 100 produk aktif per toko pada konfigurasi awal, promosi otomatis sesuai aturan; akun dasar tetap 20 listing pribadi aktif. Ambil batas dari server dan jangan menjanjikan jumlah tayangan/penjualan. Tidak ada klaim Plus adalah verifikasi identitas. Masa aktif dan tanggal berakhir ditampilkan eksplisit setelah aktivasi; definisi bulan mengikuti Q-08.

Checkout Plus terpisah dari pesanan barang: pilihan QRIS/VA, label permanen **“Simulasi pembayaran — jangan transfer uang”**, nominal, status pending/berhasil/gagal/kedaluwarsa. Ilustrasi QR/VA tidak dapat digunakan untuk membayar. Kontrol simulasi hanya bagi pengguna/environment demo yang diizinkan; jangan menjadi tombol produksi tersembunyi CSS.

Saat Plus habis, pemilik melihat banner “Toko disembunyikan karena Plus berakhir. Data dan transaksi berjalan tetap tersedia”, Perpanjang Plus, dan Buka transaksi. Publik tidak bisa melihat katalog tersembunyi; listing pribadi tidak ikut disembunyikan. Perilaku negosiasi belum disepakati mengikuti Q-09, bukan diasumsikan otomatis batal.

## 13. Notifikasi, reputasi, dan penanganan masalah — UI-09

Notifikasi adalah daftar kronologis dengan tipe, konteks singkat, waktu, unread, dan deep link. Mencakup chat, barter, pesanan, DP/pelunasan, penyerahan, pembatalan, laporan/keputusan, dan Plus. Membuka link memuat status terbaru; notifikasi lama tidak memberikan tombol untuk menjalankan aksi pada versi lama. Tidak ada prompt push atau janji WhatsApp akan mengingatkan aktivitas.

Ulasan tersedia bagi pihak yang berhak setelah Selesai: jual/PO/catering pembeli ke penjual; gratis penerima ke pemberi; barter dua arah. Form bintang 1–5 memakai radio berlabel “1 dari 5” dst., komentar opsional, preview target profil atau toko yang ditentukan transaksi. Barter yang masih menunggu publikasi menjelaskan kedua ulasan atau batas 14 hari; tidak membocorkan nilai lawan. Pemilik dapat Balas/Laporkan, bukan Hapus ulasan buruk. Aturan edit dan penyelesaian admin mengikuti Q-22.

Laporkan masalah tersedia dari listing/chat/transaksi, termasuk transaksi selesai. Form memuat kategori alasan, penjelasan, bukti opsional, dan ringkasan konteks yang akan dibagikan. Sebelum kirim, jelaskan admin dapat melihat kesepakatan serta chat/bukti terkait laporan, bukan semua chat pribadi.

Setelah satu penerimaan, pembatalan barter biasa tidak tersedia; arahkan ke laporan. Banner transaksi menggantung menjelaskan siapa belum mengonfirmasi; pengingat 24 jam dan bantuan setelah 72 jam dihitung server. Pelaporan masalah tetap dapat dilakukan segera. Tidak ada countdown menuju penyelesaian otomatis. Sanksi menyebut kemampuan yang dibatasi, alasan yang boleh ditampilkan, dan akses penyelesaian kasus; detail ban/banding mengikuti Q-20/Q-30.

## 14. Panel admin — UI-10

Desktop diutamakan untuk membandingkan bukti, tetapi fungsi penting tetap bisa dipakai mobile. Antrean laporan berupa tabel di desktop dan list berlabel di mobile: ID, jenis, status, waktu, penanggung jawab bila model peran mendukung. Filter status dan pencarian ID tidak membuka seluruh chat pengguna.

Detail kasus memisahkan Ringkasan/Kesepakatan/Bukti/Riwayat/Keputusan. Pada mobile gunakan section berurutan atau tab dengan nama jelas; pada desktop bukti dan kesepakatan boleh berdampingan. Media privat tidak dimuat sebelum akses kasus diizinkan.

Form keputusan mencatat outcome, alasan, bukti pendukung, pihak yang wajib bertindak, serta tenggat. Konfirmasi menampilkan preview keputusan dan dampak pembatasan. Admin tidak menekan tombol seolah pembeli menerima barang atau penjual menerima uang; tampilkan “Diselesaikan melalui keputusan admin” jika relevan. Admin peserta kasus tidak dapat menanganinya. Kesalahan versi karena admin lain sudah bertindak meminta muat ulang, bukan menimpa keputusan.

Pengembalian fisik/dana dicatat sebagai tindak lanjut, tidak diklaim diproses platform. Tidak ada tombol “Otomatis lapor polisi”; eskalasi hukum adalah proses manual sesuai kebijakan, bukan penetapan bersalah oleh UI.

Pengaturan batas listing/produk menampilkan nilai sekarang → nilai baru, alasan, versi konfigurasi, dan dampak sebelum Simpan. Bukan editor harga Plus atau role admin serbaguna. Kebijakan untuk akun di atas batas baru mengikuti Q-05/D-14.

## 15. Komponen bersama dan state wajib

| Komponen | Variasi utama | State yang harus didesain |
| --- | --- | --- |
| `ListingRow` / `StoreRow` | Pribadi/toko; jual/barter/gratis; PO; promosi | Loading, media gagal, unavailable, judul panjang |
| `AreaPicker` / `FilterSheet` | Area, radius, kategori, harga, sort | Izin ditolak, validasi, kosong, menerapkan, error |
| `FormField` / `PhotoUploader` | Teks, uang, jumlah, tanggal, file | Focus, helper, error, upload/retry, read-only |
| `IdentitySummary` | Profil/toko, nomor terverifikasi, ulasan | Belum ada ulasan, privat, dibatasi |
| `OfferPanel` / `ConsentBar` | Paket sendiri/lawan, cash satu arah | Belum lengkap, siap, setuju, revisi, konflik |
| `OrderSummary` / `MoneyBreakdown` | Sale/free/food, DP opsional | Ongkir belum final, saldo nol, review pembayaran |
| `TransactionStatus` / `Timeline` | Pembayaran, pemenuhan, reservasi, kasus | Menunggu aktor, gagal sinkron, selesai, disputed |
| `ChatMessage` / `TransactionCard` | Teks, gambar, sistem, versi | Sending, gagal, retry idempotent, read/unread |
| `ActionConfirm` / `InlineNotice` | Persetujuan, penerimaan, pembatalan | Pending, error, stale version, permission revoked |
| `SubscriptionNotice` / `CasePanel` | Plus dan penanganan laporan | Expired, dummy, restricted, akses ditolak |

Gunakan komponen ini sebagai kontrak konsistensi, bukan kewajiban nama file. React tidak boleh menyimpulkan kewenangan dari warna/status saja; rendering tindakan mengikuti actor, status, versi, dan capability yang diperiksa backend. Konfirmasi/pembayaran manual tidak optimistic. Notifikasi toast tidak boleh menjadi satu-satunya bukti transaksi berhasil.

Perilaku lintas layar:

- Offline: banner jelas. Membaca data lama diberi penanda; persetujuan, perubahan status pembayaran, dan publikasi tidak diam-diam diantre. Draft lokal harus berlabel Belum tersimpan ke server, dipisahkan per akun dan dibersihkan sesuai kebijakan privasi.
- Timeout aksi sensitif: “Belum dapat memastikan hasil. Memeriksa status…”; refetch menggunakan konteks/idempotency yang sama. Jangan meminta pengguna membuat pembayaran/aksi baru untuk mengatasi timeout.
- Forbidden/expired session: tidak membocorkan snapshot privat; arahkan login/hak akses, pertahankan konteks yang aman. Logout membersihkan cache privat dan draft sensitif agar pengguna berikutnya tidak melihatnya.
- Perubahan real-time: tampilkan apa yang berubah, jangan menutup dialog dengan sukses palsu. Error mempertahankan input yang masih valid.
- Form/deskripsi panjang, nama panjang, Rp bernilai besar, banyak varian, tanpa foto, dan layar landscape harus punya desain nyata; bukan hanya happy path satu item.

## 16. Bahasa, aksesibilitas, dan performa

### 16.1 Copy

Bahasa Indonesia, sentence case, ramah dan langsung. Gunakan “pesanan”, “tawaran”, “diambil”, “uang diterima”; istilah teknis seperti reservation, entitlement, stale version tidak muncul sebagai pesan pengguna. Kata “Siap” dalam barter tidak disamakan dengan “Disepakati”. “Nomor terverifikasi” tidak disamakan dengan identitas terverifikasi.

Uang: `Rp100.000`, tanpa desimal yang tidak diperlukan; satuan eksplisit `/pcs`, `/paket`. Tanggal dan tenggat transaksi menampilkan WIB; waktu relatif pada feed dapat digunakan dengan tanggal lengkap pada detail. Copy pembayaran barang selalu menjelaskan pembayaran langsung, dan billing dummy selalu menjelaskan jangan transfer.

### 16.2 Target aksesibilitas

Target implementasi adalah WCAG 2.2 AA, dengan target sentuh internal 48 × 48 CSS px. Acuan pemeriksaan: contrast minimum, reflow, focus, labels/errors, dan target size pada [W3C WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/). Target 48 px adalah pilihan produk, bukan klaim ukuran minimum WCAG AA.

- Kontras teks biasa ≥4,5:1; teks besar dan batas/indikator kontrol penting ≥3:1 sesuai konteks kriteria. Warna bukan satu-satunya pembeda status/error.
- Reflow pada lebar 320 CSS px tanpa scroll horizontal halaman; font zoom 200% tanpa kehilangan fungsi. Wireframe teks dalam dokumen bukan implementasi responsive.
- Keyboard seluruh alur; urutan fokus logis; fokus tidak tertutup sticky bar; dialog mengembalikan fokus; heading dan label semantik. Tidak menonaktifkan zoom browser.
- Input mempunyai label permanen, helper dan error terkait; ringkasan error dapat difokuskan. Tindakan state diumumkan melalui live region singkat, bukan membaca ulang seluruh chat.
- Foto barang mempunyai deskripsi yang sesuai; dekorasi tidak dibacakan. Gallery dapat dioperasikan tanpa gesture; radio rating, tab, status unread, dan tombol ikon punya nama aksesibel.
- Uji manual pembaca layar mobile dan keyboard desktop. Skor pemeriksaan otomatis saja tidak cukup untuk menyatakan lulus.

### 16.3 Anggaran performa usulan

Ini target untuk diverifikasi ketika aplikasi ada, bukan hasil sekarang: LCP ≤2,5 detik, INP ≤200 ms, CLS ≤0,1 pada pengukuran pilot yang representatif; catat perangkat/jaringan dan ukuran sampel. Uji lab mobile jaringan lambat mendahului data lapangan, tidak digantikan klaim dari satu screenshot.

Listing awal memuat satu page backend, gambar thumbnail responsif terkompresi, lazy-load gambar di bawah viewport; jangan lazy-load gambar utama yang diperlukan untuk tampilan awal. Dimensi media dicadangkan. Peta, admin, viewer gambar penuh, dan form kompleks dimuat saat dibutuhkan. Usulan anggaran JS awal feed ≤200 KB gzip, tidak termasuk chunk rute lain; ukur build dan revisi anggaran bila tidak realistis, jangan mengurangi privasi untuk mengejar skor.

Tidak perlu dark mode, custom font, atau animasi berat pada versi awal. Jangan memasang dependency peta/payment/chart hanya untuk melengkapi gambar desain yang belum termasuk implementasi.

## 17. Penelusuran kebutuhan dan penerimaan desain

Pemetaan berikut melengkapi, bukan menggantikan, 244 butir dalam matriks RFC. T-ID adalah rencana tes yang sudah ada; UX-ID di bawah adalah skenario penerimaan desain tambahan. Tidak satupun berarti telah diuji pada aplikasi.

| Desain | PRD | Referensi RFC/test relevan |
| --- | --- | --- |
| UI-01 Penemuan | §3, §5, §8 | RFC §12, §16; T-22, T-23, T-27, T-28 |
| UI-02 Detail/toko publik | §5–§8, §15 | RFC §21; T-24, T-27, T-44, T-47 |
| UI-03 Auth/onboarding | §4–§5 | RFC §5, §11; T-01, T-20, T-21, T-23 |
| UI-04 Publikasi/kelola | §6–§7, §11 | RFC §21; T-11, T-24, T-25, T-26, T-34 |
| UI-05 Chat | §13 | RFC §13; T-13, T-16, T-39, T-40 |
| UI-06 Barter | §9, §12, §14 | RFC §7–§8; T-02, T-03, T-04, T-14, T-15, T-29, T-30, T-31 |
| UI-07 Pesanan | §10–§12 | RFC §7, §9, §23; T-05, T-06, T-07, T-08, T-32, T-33, T-34, T-35, T-36, T-37, T-38, T-49, T-50 |
| UI-08 Akun/Plus | §6 | RFC §14; T-09, T-10, T-11, T-18, T-47 |
| UI-09 Notifikasi/reputasi/kasus | §13–§15 | RFC §13, §15; T-17, T-41, T-42, T-43, T-44 |
| UI-10 Admin | §6, §14 | RFC §15, §22; T-12, T-13, T-42, T-48 |
| Lintas layar | §16–§18 | RFC §16, §24–§25; T-20, T-45, T-46, T-54, T-55 |

| ID | Skenario peninjauan | Hasil yang diterima |
| --- | --- | --- |
| UX-01 | Home 390 × 844, font default | Search/area/kategori mudah ditemukan dan awal listing pertama terlihat tanpa hero; kepadatan tidak mengorbankan tap target |
| UX-02 | Cari → filter → detail → kembali | Query, filter, tab, posisi hasil kembali; promosi berlabel dan sesuai filter |
| UX-03 | Lebar 320/360/390/768/1280; zoom; keyboard mobile | Tidak ada konten/CTA tertutup atau overflow halaman; kedua paket barter bisa ditinjau |
| UX-04 | Akun dasar memasang PO | Bisa memakai profil pribadi tanpa checkout Plus; gate verifikasi kembali ke draft |
| UX-05 | Barter dua akun, perubahan foto setelah siap/setuju | Reset kedua consent terlihat; versi lama tidak bisa disetujui; reservasi hanya sesudah hasil server |
| UX-06 | Kuota terakhir atau barang direbut transaksi lain | Pesan konflik jelas, input terjaga, tidak ada sukses atau reservasi parsial palsu |
| UX-07 | PO Rp100.000 DP 50%, tanpa DP, dan DP 100% | Rp50.000 DP/sisa untuk contoh; tanpa DP skip; 100% tidak ditagih dua kali; tombol pengakuan hanya penjual |
| UX-08 | DP terlambat, siap diambil belum lunas, satu receipt | Status terpisah dan aktor berikut jelas; tidak auto-batal atau auto-selesai |
| UX-09 | Plus habis, dummy gagal/sukses, pengguna publik | Peringatan dummy jelas; katalog tersembunyi publik, transaksi lama tetap bisa diakses peserta |
| UX-10 | Sengketa satu dari dua pesanan dalam satu chat | Preview lingkup bukti tepat; admin tidak membaca chat tak terkait; keputusan tidak menyamar menjadi receipt pengguna |
| UX-11 | Offline, timeout, reconnect, logout A/login B | Tidak menjalankan consent tertunda; status diperiksa ulang; cache privat A tidak terlihat pada B |
| UX-12 | Screen reader/keyboard, nama panjang, foto gagal | Label, fokus, pengumuman status, fallback media dan akses tindakan tetap jelas |
| UX-13 | Uji tugas dengan calon pengguna warga/UMKM | Pengguna dapat menjelaskan beda Siap/Setujui, DP/pelunasan, dan pembayaran langsung tanpa diberi jawaban |

Usulan sesi usability: lima peserta dengan campuran warga dan pelaku usaha rumahan, memakai ponsel mereka. Tugas: cari barang sekitar, pasang PO pribadi, barter revisi, cek DP, serta temukan laporan. Catat penyelesaian tanpa bantuan, salah klik, pemahaman status, dan titik kebingungan; ini studi eksplorasi kecil, bukan ukuran keberhasilan populasi. Tidak meminta transfer nyata atau alamat rumah asli dalam pengujian.

## 18. Keputusan terbuka dan paket handoff

Hal berikut tetap memerlukan keputusan produk; desain di atas hanya menyediakan tempat/state yang diperlukan:

| Topik | Referensi | Dampak sebelum implementasi final |
| --- | --- | --- |
| Guest, lokasi manual, alamat wajib, radius/blur | Q-01, Q-02, Q-04, Q-26 | Gate masuk, field onboarding, pilihan lokasi dan copy jarak |
| Recovery dan parameter OTP | Q-03, Q-27 | State bantuan, retry, pembatasan dan pemulihan |
| Kategori, media, profil toko, kuota parsial/batch | Q-07, Q-10, Q-15, Q-28 | Field wajib, uploader, edit katalog dan jadwal |
| Batas akun, perpindahan listing/toko, siklus Plus | Q-05, Q-06, Q-08, Q-09 | Counter, editor penerbit, masa aktif, negosiasi saat expired |
| Amend/refund, DP, ongkir gratis, harga tetap | Q-12, Q-13, Q-14, Q-16, Q-17, Q-31 | Tombol konfirmasi ulang, saldo, pembatalan dan pengembalian |
| Blokir/ban/banding, bukti, no-show, ulasan | Q-18, Q-20, Q-21, Q-22, Q-29, Q-30 | Akses kasus, alasan pembatasan, retensi dan hak review |
| Favorit, follow, share, jadwal reminder | Q-11, Q-19 | Tidak ditampilkan seolah sudah termasuk fitur awal |
| Prioritas demo, metrik, provider | Q-23, Q-24, Q-25 | Frame yang dibangun dulu, instrumentasi dan integrasi nyata |

Paket desain sebelum implementasi UI dinyatakan siap:

- Token dan komponen di §3/§15, dengan state default/focus/error/loading/disabled yang dapat diperiksa.
- Frame mobile utama untuk seluruh UI-01–UI-10, desktop untuk feed/detail/barter/admin, dan edge case UX-01–UX-12. Dokumen saat ini menyediakan wireframe teks home/barter/PO; frame visual lainnya belum dibuat.
- Prototype terhubung untuk pencarian→chat, pasang pribadi, barter dua pihak dengan revisi, PO dengan DP manual, Plus dummy/expired, dan laporan/admin. Prototype tidak boleh diklaim backend berfungsi.
- Catatan D/Q yang dipakai per frame, keterbatasan demo, serta tautan kebutuhan dan bukti uji saat implementasi tersedia.

Urutan desain yang direkomendasikan: fondasi dan penemuan → detail/auth/pasang → chat/barter/PO → toko/Plus → reputasi/kasus/admin → pengujian lintas layar. Ini urutan pengerjaan, bukan pengurangan scope atau janji seluruh produk selesai dalam 27 jam.

Review arah draft: sudah menjaga karakter classified melalui direktori, tautan, dan baris sederhana; adaptasi mobile menambahkan thumbnail, tipografi terbaca, navigasi bawah, serta aksi transaksi kontekstual. Tidak menambahkan checkout barang, WhatsApp transaksi, favorit/follow, atau fitur di luar PRD. Persetujuan desain dan prioritas implementasi masih menunggu peninjauan pengguna.
