# Barter — Marketplace Lingkungan dan Toko UMKM

Versi: 1.3 — draft hasil brainstorming  
Tanggal penyusunan: 10 September 2026  
Acuan awal: PRD v1.2, 9 September 2026  
Status: arah produk dan sebagian besar alur disepakati; prioritas demo dan keputusan terbuka masih perlu dibahas.

## 1. Tujuan dokumen

Dokumen ini mencatat keputusan percakapan sebagai dasar pengembangan. Persyaratan pada bagian fitur merupakan keputusan yang telah dibahas, kecuali secara eksplisit diberi label **Usulan** atau **Terbuka**. PRD ini belum merupakan spesifikasi teknis implementasi.

Target pengerjaan adalah **9 hari × 3 jam = 27 jam** untuk **demo terintegrasi dan uji coba terbatas**, bukan peluncuran transaksi nyata kepada masyarakat. Daftar fitur produk tidak berarti seluruhnya dijamin selesai dalam 27 jam. Pembagian prioritas demo pada bagian 17 masih berupa usulan.

## 2. Masalah, pengguna, dan nilai produk

Warga membutuhkan cara menemukan, menjual, menukar, dan membagikan barang di lingkungan sekitar. Pelaku usaha rumahan, terutama ibu rumah tangga, membutuhkan cara memasarkan catering, pre-order makanan, dan produk lainnya tanpa harus membangun toko online sendiri.

Barter mempertemukan pembeli, penjual, pemberi, dan penerima. Platform membantu pencarian, percakapan, pencatatan kesepakatan, dan penyelesaian masalah. Pembayaran barang dilakukan langsung antar pengguna; Barter tidak menerima, menahan, atau meneruskan uang transaksi tersebut.

Nilai utama:

- Penawaran sekitar, dengan radius pencarian awal 5 km.
- Jual beli, barter, dan pemberian gratis untuk mengurangi barang terbuang.
- Katalog serta identitas toko bagi UMKM.
- Privasi lokasi pribadi.
- Biaya platform transaksi barang 0%.
- Pendapatan dari langganan Plus, bukan potongan transaksi barang.

Pengguna utama adalah warga pembeli/penjual, usaha rumahan, pemilik toko Plus, dan admin. Satu akun dapat menjalankan peran pembeli, penjual pribadi, serta pemilik toko sekaligus.

## 3. Cakupan wilayah dan platform

- Aplikasi web yang dioptimalkan untuk mobile; bukan aplikasi native.
- Wilayah peluncuran: Jabodetabek, tanpa Kepulauan Seribu.
- Interpretasi wilayah untuk implementasi: lima kota Jakarta; Kota/Kabupaten Bogor; Depok; Kota/Kabupaten Tangerang; Tangerang Selatan; Kota/Kabupaten Bekasi. Daftar kode wilayah final perlu diverifikasi saat integrasi data alamat.
- Feed awal memakai radius 5 km. Pengguna dapat memperluas pencarian secara manual.
- Pencarian boleh melintasi batas kota selama penawaran berada dalam wilayah layanan.
- Catering dapat mencantumkan area layanan/pengantaran.
- **Terbuka:** pilihan radius maksimum dan aturan akses pengguna yang berdomisili di luar Jabodetabek. Usulan sebelumnya adalah membatasi lokasi penerbitan listing/toko, bukan domisili akun.

## 4. Akun, autentikasi, dan profil

### 4.1 Jalur masuk

- Login melalui Google OAuth atau email/password menggunakan Supabase Auth.
- Pengguna yang mendaftar melalui Google tetap wajib melengkapi nama dan alamat/lokasi.
- Akun Google tidak perlu membuat password Barter untuk menggunakan login Google.
- Profil dan lokasi lengkap diperlukan sebelum memposting, mengirim chat, atau memulai transaksi.

### 4.2 Data profil

| Data | Kebutuhan | Visibilitas |
| --- | --- | --- |
| Nama | Wajib | Nama tampilan publik |
| Email | Untuk akun email atau dari Google | Privat |
| Nomor telepon | Opsional | Privat secara default |
| Alamat/lokasi | Wajib untuk konteks lingkungan | Publik hanya area perkiraan |
| Foto profil dan bio | Usulan opsional | Publik jika diisi |
| Status verifikasi, reputasi, Plus, sanksi | Dikelola sistem | Sesuai tujuan masing-masing |

**Terbuka:** apakah alamat wajib cukup wilayah administratif dan titik peta atau mencakup jalan/nomor rumah. Rekomendasi brainstorming: area dan titik lokasi wajib, detail alamat rumah opsional. Rekomendasi ini perlu dikonfirmasi sebelum formulir final.

### 4.3 Akses pengunjung

**Usulan akses pengunjung:** feed, pencarian, detail listing, dan toko dapat dibuka tanpa login. Login diperlukan untuk aksi pribadi dan transaksi. Izin lokasi perangkat tidak wajib; lokasi bisa dipilih manual.

**Terbuka:** penautan Google dengan akun email yang sudah ada, penghapusan akun, dan kebijakan pemulihan akun.

## 5. Privasi lokasi

- Profil dan listing pribadi menampilkan lokasi perkiraan dan jarak yang dibulatkan; koordinat tepat tidak ditampilkan publik.
- Toko menggunakan lokasi perkiraan secara default.
- Pemilik toko dapat secara sengaja memilih mempublikasikan alamat lengkap usaha.
- Setiap toko dapat memiliki lokasi dan pengaturan visibilitas sendiri.
- Titik pertemuan/pengambilan dibagikan secara sengaja melalui chat; kesepakatan barter tidak otomatis membuka alamat rumah.
- **Terbuka:** tingkat penyamaran, ukuran area, pembulatan jarak, dan penggunaan lokasi rumah dibanding titik pengambilan sebagai acuan listing. FRD harus memastikan data yang dikirim ke pengunjung juga tidak membocorkan koordinat privat.

## 6. Akun dasar, Plus, dan toko

### 6.1 Batas dan hak akses

| Fasilitas | Akun dasar | Plus |
| --- | --- | --- |
| Listing pribadi aktif | Maksimal 20 | Maksimal 20 |
| Jual dagangan usaha lewat listing biasa | Boleh | Boleh |
| Toko | Tidak tersedia | Maksimal 3 |
| Produk aktif per toko | Tidak berlaku | Maksimal 100 |
| Promosi produk toko di feed | Tidak tersedia | Otomatis sesuai aturan promosi |

- Toko bersifat opsional. Pengguna gratis boleh memposting catering, PO, dan dagangan preloved melalui listing biasa.
- Draft, arsip, dan listing yang selesai tidak menghitung batas aktif. Listing direservasi tetap dihitung.
- Batas listing/produk dapat diubah melalui pengaturan admin.
- **Terbuka:** kebijakan penerapan perubahan batas untuk akun yang sudah melampaui batas baru.

### 6.2 Pengelolaan toko

- Satu akun Plus mengelola maksimal tiga toko, dengan profil dan katalog terpisah.
- Setiap toko boleh memiliki lokasi usaha berbeda; penemuan/promosi mengikuti lokasi toko tersebut.
- Saat memposting, pengguna memilih identitas profil pribadi atau toko terkait.
- Hanya akun pemilik yang mengelola toko. Akses staf dan pembagian izin tidak termasuk versi awal.
- Informasi toko yang diusulkan: nama, logo/foto, deskripsi, kategori usaha, lokasi, jam operasional, serta pilihan pengambilan/pengantaran.
- **Terbuka:** aturan memindahkan listing pribadi ke toko, penggantian/penghapusan toko, dan apakah sebuah produk boleh dimuat di beberapa toko.

### 6.3 Langganan dan pembayaran demo

- Harga Plus: **Rp20.000 per bulan**.
- Metode pembayaran yang direncanakan: QRIS dan bank virtual account.
- Versi awal memakai pembayaran **dummy**, tanpa payment gateway atau transfer nyata.
- Tampilan pembayaran diberi label simulasi dan instruksi tidak perlu transfer.
- Simulasi mendukung berhasil, gagal, dan kedaluwarsa. Aktivasi melalui simulasi hanya untuk lingkungan pengembangan/demo.
- Usulan siklus: pembelian manual tanpa auto-debit; perpanjangan sebelum habis menambah masa aktif dari tanggal berakhir, sedangkan pembelian setelah habis dimulai dari aktivasi baru.
- **Terbuka:** definisi satu bulan kalender versus durasi hari tetap, zona waktu penagihan, dan detail siklus langganan final.

### 6.4 Plus berakhir

- Ketiga toko dan produknya disembunyikan dari publik; promosi berhenti.
- Data toko/katalog tetap tersimpan untuk digunakan kembali setelah Plus aktif.
- Listing pribadi tetap berjalan sesuai status masing-masing.
- Chat dan transaksi yang sudah berjalan tetap dapat diakses serta diselesaikan.
- **Terbuka:** perilaku negosiasi toko yang belum menjadi kesepakatan saat masa aktif habis.

## 7. Listing, kategori, dan varian

### 7.1 Jenis penawaran

- **Jual:** harga dan pilihan bisa/tidak bisa ditawar.
- **Barter:** barang yang diinginkan atau terbuka untuk tawaran.
- **Jual atau barter:** satu listing mendukung kedua jalur dengan ketersediaan yang sama.
- **Gratis:** tidak ada harga barang atau kewajiban memberikan barang pengganti.
- Catering dan PO adalah bentuk penawaran usaha dengan kebutuhan jadwal, minimum pembelian, kuota, dan pesanan.

Listing pribadi dan toko adalah identitas penerbit; tidak boleh disamakan dengan jenis transaksi. Catering/PO juga tidak boleh diperlakukan sebagai pilihan yang bertentangan dengan kategori produk pada model data final.

### 7.2 Isi listing dan varian

- Barang preloved mencakup pakaian, furnitur, kendaraan, dan barang lain sesuai kategori yang akan ditetapkan.
- Informasi dasar: nama, detail, foto, kategori, lokasi, jenis penawaran, serta harga jika dijual.
- Kondisi dan kekurangan barang harus bisa dijelaskan. Kelengkapan dokumen kendaraan dapat dicatat pada kesepakatan.
- Varian tersedia sejak versi awal. Setiap pilihan mempunyai nama dan harga sendiri.
- Ringkasan pesanan dapat berisi beberapa varian dengan jumlah dan subtotal masing-masing.
- Nama, harga, varian, dan ketentuan disimpan sebagai salinan kesepakatan; perubahan katalog tidak mengubah pesanan lama.
- **Terbuka:** daftar kategori dan field wajib per kategori, batas foto/ukuran berkas, dukungan stok barang non-PO, serta kombinasi atribut varian.

### 7.3 Publikasi dan perubahan

- Profil lengkap dan nomor terverifikasi dapat langsung menerbitkan listing setelah validasi informasi wajib, tanpa persetujuan admin.
- Pemilik dapat menyimpan draft, menerbitkan, mengedit, dan mengarsipkan listing.
- Listing yang sedang direservasi tidak dapat dihapus atau diubah detail penawarannya sampai transaksi selesai/dibatalkan.
- Menghilangkan listing dari publik tidak menghapus riwayat transaksi atau bukti sengketa.
- Pengguna dapat melaporkan listing; admin dapat menyembunyikannya dengan alasan tercatat dan notifikasi kepada pemilik.
- **Terbuka:** penerapan penguncian perubahan pada listing berkuota yang memiliki beberapa pesanan bersamaan. Aturan barang tunggal tidak boleh secara tidak sengaja mengunci seluruh operasional PO.

## 8. Feed, pencarian, dan promosi

- Feed utama menggabungkan barang pribadi dan dagangan usaha sekitar.
- Pencarian berdasarkan nama barang, produk, atau toko.
- Filter: kategori, jarak, rentang harga, serta bentuk penawaran yang relevan.
- Pengurutan: relevansi, terbaru, atau terdekat.
- Tab **Toko sekitar** untuk menemukan UMKM dan membuka katalog.
- Kartu PO menampilkan batas pemesanan serta jadwal tersedia.
- Produk aktif dari toko Plus memenuhi syarat promosi otomatis dan bergiliran.
- Maksimal satu slot promosi per 10 listing; label **Dipromosikan** wajib terlihat.
- Porsi promosi dibagi per akun Plus, bukan per toko. Tiga toko tidak otomatis memberi tiga kali porsi.
- Promosi tetap mengikuti filter serta area pencarian pembeli.
- Barang habis, direservasi, dan PO yang sudah ditutup tidak dipromosikan; penayangan dan penjualan tidak dijamin.
- **Terbuka:** aturan produk yang sebagian kuotanya direservasi, pengulangan produk di satu feed, daftar pilihan radius, favorit, mengikuti toko, dan pembagian tautan.

## 9. Ruang barter dan tambahan uang

### 9.1 Isi penawaran

- Ruang barter mempunyai kolom terpisah untuk A dan B.
- Masing-masing boleh menawarkan beberapa barang; setiap barang mempunyai nama, detail, dan foto.
- Barang bisa dipilih dari listing milik sendiri atau ditambahkan langsung dalam ruang barter.
- Barang yang ditambahkan langsung tidak otomatis dipublikasikan.
- Persetujuan berlaku untuk keseluruhan paket, bukan per barang.
- Masing-masing pihak tetap menawarkan minimal satu barang. Uang saja untuk membeli barang memakai jalur jual beli.
- Tambahan uang dalam rupiah boleh dibayarkan oleh satu pihak saja. Nominal dan pihak pembayar tercantum dalam penawaran.

### 9.2 Persetujuan dan perubahan

1. A dan B menyusun penawaran masing-masing.
2. Masing-masing menekan **Siap**.
3. Setelah keduanya siap, tombol **Setujui** tersedia untuk keduanya.
4. Jika baru satu menyetujui, tampilkan menunggu pihak lain.
5. Setelah keduanya menyetujui, barter menjadi **Disepakati** dan pertemuan dapat diatur.

Perubahan nama, detail, foto, jumlah/anggota paket barang, nominal uang, atau pihak pembayar membatalkan seluruh status Siap dan Setujui kedua pihak. Keduanya harus meninjau versi baru dan menekan Siap lagi. Persetujuan atas versi lama tidak boleh menyelesaikan versi baru.

### 9.3 Reservasi dan penyelesaian

- Beberapa negosiasi boleh berjalan atas barang yang sama.
- Saat satu barter disepakati, semua listing yang terlibat direservasi dan tidak dapat disepakati dalam transaksi lain, termasuk jalur jual beli.
- Negosiasi lain mendapat pemberitahuan bahwa barang direservasi.
- Jika barter dibatalkan sebelum penyerahan sesuai aturan, reservasi dapat dilepas.
- Penguncian otomatis berlaku pada identitas listing yang sama. Sistem belum dapat mengenali duplikasi barang yang dimasukkan langsung ke ruang berbeda.
- Saat bertemu, kedua pihak memeriksa barang asli terhadap penawaran.
- Tambahan uang dibayar saat serah terima setelah pemeriksaan; tidak ada DP barter.
- Masing-masing menekan **Barang sudah diterima**, dengan penjelasan sudah memeriksa dan menerima barang.
- Penerima uang tambahan juga menekan **Uang tambahan diterima**.
- Barter selesai setelah seluruh konfirmasi penerimaan barang dan uang yang diperlukan terpenuhi.
- **Terbuka:** apakah perubahan setelah status Disepakati membuka ulang penawaran dalam transaksi yang sama atau harus melalui pembatalan. Reservasi tidak boleh dilepas hanya karena salah satu pihak mengedit sepihak.

## 10. Jual beli preloved dan pemberian gratis

### 10.1 Jual beli

1. Pembeli dan penjual bernegosiasi melalui chat.
2. Penjual membuat ringkasan barang, harga akhir, dan cara penyerahan.
3. Pembeli mengonfirmasi; barang direservasi.
4. Pembeli memeriksa barang dan membayar langsung kepada penjual.
5. Penjual mengonfirmasi pembayaran dan penyerahan; pembeli mengonfirmasi penerimaan.
6. Setelah seluruh konfirmasi terpenuhi, transaksi selesai.

### 10.2 Pemberian gratis

- Listing jelas berlabel Gratis.
- Pemilik memilih penerima; tidak wajib mengikuti urutan chat masuk.
- Pemilik membuat kesepakatan barang, jumlah, dan cara penyerahan.
- Penerima mengonfirmasi; barang/jumlah terkait direservasi.
- Barang yang dapat dibagi, seperti hasil kebun, boleh dialokasikan kepada beberapa penerima sampai stok habis.
- Kedua pihak mengonfirmasi serah terima untuk menyelesaikan transaksi.
- Pengantaran dapat berbiaya, tetapi dipisahkan dari harga barang Rp0 dan disepakati sebelumnya.
- **Terbuka:** konfirmasi ongkir pada pemberian gratis dan pemeriksaan ketersediaan stok terbagi.

## 11. Catering, PO, kuota, dan pembayaran langsung

### 11.1 Katalog dan ringkasan pesanan

- Catering memerlukan paket/menu, harga dan satuan, minimum pesanan jika ada, waktu persiapan, tanggal kebutuhan, dan area layanan.
- PO memerlukan produk/varian, harga dan satuan, minimum pembelian jika ada, batas pemesanan, jadwal tersedia, serta kuota jika dibatasi.
- Ketersediaan catering dikelola manual karena bergantung tanggal serta ukuran pesanan.
- Penjual membuat ringkasan pesanan dari chat; pembeli mengonfirmasi.
- Ringkasan mencakup pilihan produk, jumlah, subtotal, ongkir, total, jadwal/cara penyerahan, DP jika ada, pelunasan, dan ketentuan pembatalan.
- Perubahan pesanan yang sudah dikonfirmasi memerlukan konfirmasi ulang pembeli.
- **Terbuka:** mekanisme perubahan ketika DP sudah dibayar, termasuk selisih tagihan dan penyesuaian kuota.

### 11.2 Minimum pembelian dan kuota

- Minimum pembelian dihitung dari total semua varian. Minimum 10 pcs dapat dipenuhi dengan 6 varian A + 4 varian B.
- Penjual memilih kuota bersama satu listing atau kuota terpisah per varian.
- Kuota direservasi saat pembeli mengonfirmasi, termasuk saat menunggu DP.
- Konfirmasi tidak boleh membuat kuota terlampaui. Jika tidak cukup, pembeli diminta menyesuaikan jumlah.
- PO penuh ditandai tidak tersedia untuk jumlah yang telah habis.
- Pembatalan mengembalikan kuota selama pemesanan masih dibuka.
- **Terbuka:** pengulangan PO dalam batch/tanggal berbeda dan pemesanan campuran satuan yang tidak dapat dijumlahkan langsung.

### 11.3 DP

- DP opsional per PO; penjual menentukan persentasenya.
- Total tagihan = total harga barang + ongkos kirim. Persentase DP dihitung dari total tersebut.
- Contoh: total Rp100.000, DP 50% menghasilkan DP Rp50.000 dan sisa Rp50.000.
- Setelah konfirmasi pesanan, status pembayaran menjadi **Menunggu DP** jika diwajibkan.
- Pembeli membayar langsung. Penjual memeriksa uang masuk lalu menekan **Konfirmasi DP diterima**.
- Pesanan yang mewajibkan DP baru bisa ditandai Diproses setelah konfirmasi penerimaan DP.
- Pesanan tanpa DP melewati tahap ini.
- Penjual menentukan tenggat DP, terlihat sebelum konfirmasi pembeli.
- Tenggat terlewat tanpa konfirmasi membuat pesanan berstatus **Perlu pemeriksaan pembayaran**. Kuota tetap direservasi sampai penjual memeriksa dan mengonfirmasi atau membatalkan.
- Tidak ada pembatalan otomatis semata karena DP belum dikonfirmasi.
- **Terbuka:** pembulatan rupiah, batas persentase DP, tenggat berupa waktu absolut atau durasi per pesanan, serta pesanan yang terus tertahan karena penjual tidak memeriksa pembayaran.

### 11.4 Pelunasan, penyerahan, dan pembatalan

- Penjual menentukan pelunasan sebelum pengambilan/pengiriman atau saat serah terima.
- Penjual menekan **Konfirmasi pelunasan diterima** setelah memeriksa pembayaran.
- Status pembayaran terpisah dari pengerjaan: pesanan dapat Siap diambil tetapi belum lunas.
- Status penyerahan mencakup Siap diambil atau Sedang diantar sesuai metode.
- Penjual mengonfirmasi penyerahan, pembeli menekan Pesanan diterima.
- Pesanan selesai setelah kedua konfirmasi penyerahan/penerimaan dan konfirmasi pelunasan terpenuhi.
- Sebelum Diproses, pembeli boleh membatalkan dengan alasan.
- Setelah Diproses, pembeli mengajukan pembatalan yang memerlukan persetujuan penjual.
- Ketentuan pembatalan ditampilkan sebelum kesepakatan. Pengembalian uang dilakukan langsung antar pihak.
- **Terbuka:** kebijakan DP pada pembatalan dan pencatatan pengembalian dana; konfirmasi manual pembayaran tidak membuktikan adanya transfer melalui platform.

## 12. Pengambilan, pertemuan, dan pengantaran

- Pilihan: diambil pembeli, bertemu di lokasi yang disepakati, atau diantar dengan pengaturan langsung antar pihak.
- Pemesanan kurir dan pelacakan otomatis tidak tersedia pada versi awal.
- Ongkir harus diketahui dan masuk ringkasan sebelum konfirmasi; ongkir yang masih dihitung menghalangi konfirmasi.
- Perubahan ongkir/metode penyerahan setelah kesepakatan memerlukan persetujuan ulang.
- Alamat penyerahan yang dibagikan tetap berada dalam konteks transaksi, bukan otomatis dipublikasikan.

## 13. Chat dan notifikasi

### 13.1 Chat

- Satu percakapan untuk pasangan pengguna pada satu listing; pembicaraan listing berbeda terpisah.
- Pesanan ulang di listing yang sama dapat memakai percakapan yang sama dengan kartu kesepakatan berbeda.
- Mendukung teks, foto kondisi barang/bukti transfer, kartu listing, kartu kesepakatan, dan status transaksi.
- Mendukung penanda terkirim/dibaca dan jumlah belum dibaca; pembaruan real-time ketika aplikasi dibuka.
- Pengguna dapat memblokir pengguna lain atau melaporkan percakapan.
- Pesan terkirim tidak bisa diedit/ditarik pada versi awal; koreksi lewat pesan baru.
- **Terbuka:** dampak blokir terhadap transaksi aktif, batas lampiran, serta pemisahan akses admin ketika satu chat berisi beberapa transaksi dan hanya satu dilaporkan.

### 13.2 Notifikasi

- Pusat notifikasi dalam aplikasi untuk pesan, perubahan barter, persetujuan, pesanan, tenggat DP, pembayaran, penyerahan, pembatalan, laporan, keputusan admin, dan Plus.
- Setiap notifikasi menuju konteks terkait.
- Pengingat tenggat dikirim sekali per tahap; bukan berulang tanpa batas.
- Tidak ada push notification; saat aplikasi ditutup belum ada pemberitahuan langsung aktivitas transaksi.
- **Terbuka:** jarak waktu pengingat Plus/DP dan jadwal pengingat relatif terhadap tenggat.

## 14. Pembatalan, sengketa, dan admin

### 14.1 Pembatalan barter dan laporan

- Sebelum konfirmasi penerimaan barang, salah satu pihak boleh membatalkan dengan alasan wajib. Pihak lain diberi tahu dan reservasi dapat dilepas.
- Setelah satu pihak mengonfirmasi penerimaan, pembatalan biasa dinonaktifkan. Pengguna menggunakan Laporkan masalah; reservasi tetap ditahan selama sengketa.
- Pelaporan tetap tersedia setelah transaksi selesai jika masalah baru ditemukan.
- Pemeriksaan fisik dilakukan oleh pihak bertransaksi saat bertemu; penolakan sebelum pertukaran dapat diselesaikan dengan pembatalan beralasan.

### 14.2 Wewenang dan bukti admin

- Laporan masuk panel admin dengan alasan, penjelasan, bukti opsional, salinan kesepakatan, serta riwayat perubahan/status.
- Admin boleh melihat chat terkait transaksi yang dilaporkan; percakapan di luar lingkup tersebut tetap privat. Akses ini dijelaskan kepada pengguna.
- Admin menjadi penengah dan memberikan keputusan akhir penanganan di platform, termasuk menentukan apakah barang harus dikembalikan.
- Pengembalian fisik dilakukan para pihak, bukan platform.
- Keputusan, alasan, bukti pendukung, tenggat tindak lanjut, dan riwayat tindakan dicatat.
- Sanksi berupa pembatasan akun hingga ban sesuai tingkat/pengulangan pelanggaran.
- Akun yang dibatasi tetap dapat mengakses chat sengketa dan laporan untuk menyelesaikan kewajiban.
- Kasus dugaan pelanggaran hukum dapat dieskalasikan secara manual kepada kepolisian dengan bukti terkait. Keputusan moderasi bukan penetapan bersalah secara hukum; tidak ada pelaporan otomatis.
- **Terbuka:** akses akun yang terkena ban penuh, tahapan laporan, tenggat/banding keputusan, verifikasi pengembalian barang, serta pembagian peran admin.

### 14.3 Transaksi menggantung

- Jika satu pihak sudah mengonfirmasi penerimaan tetapi pihak lain belum merespons: pengingat dalam aplikasi setelah 24 jam.
- Setelah tiga hari, pihak yang sudah mengonfirmasi dapat meminta bantuan admin.
- Tidak otomatis selesai karena waktu berlalu.
- Admin memeriksa riwayat/bukti/keterangan untuk memutuskan status dan reservasi dengan alasan tercatat.
- Laporan masalah tetap dapat dibuat tanpa menunggu tiga hari.
- **Terbuka:** tenggat pertemuan yang tidak terlaksana ketika belum ada konfirmasi penerimaan sama sekali.

## 15. Rating dan reputasi

- Ulasan hanya untuk transaksi Selesai; satu ulasan per pihak yang berhak.
- Bintang 1–5 dengan komentar opsional.
- Jual beli/makanan: pembeli menilai penjual.
- Barter: kedua pihak saling menilai.
- Gratis: penerima menilai pemberi.
- Transaksi pribadi masuk reputasi profil; transaksi toko masuk reputasi toko terkait, terpisah antar toko.
- Pemilik dapat membalas dan melaporkan ulasan, tetapi tidak menghapus sendiri.
- Ulasan barter ditampilkan setelah keduanya mengulas atau setelah batas 14 hari. Usulan acuan waktu: sejak transaksi Selesai.
- **Terbuka:** penyuntingan ulasan, hak ulasan pada transaksi yang diselesaikan admin, dan perlakuan ulasan ketika transaksi kemudian disengketakan/dibatalkan.

## 16. Teknologi dan batas teknis

Pilihan pengguna:

- React untuk antarmuka.
- Vercel untuk hosting aplikasi.
- Supabase untuk autentikasi dan backend.

Usulan arsitektur untuk FRD:

- Supabase Database, Storage, dan Realtime untuk data, lampiran, dan chat.
- Backend memvalidasi tindakan sensitif: persetujuan, reservasi, kuota, pembayaran manual, hak Plus, dan sanksi. Validasi tidak boleh hanya dilakukan di tampilan.
- Identitas versi kesepakatan dan pembaruan ketersediaan yang tidak dapat bertabrakan dibutuhkan untuk persetujuan serta reservasi.
- Data uji dan mode pembayaran dummy diberi penanda yang jelas.

Belum ditentukan: penyedia email produksi, penyedia peta/geocoding, versi dependensi, dan strategi pekerjaan terjadwal. Pemilihan teknis ini tidak boleh dianggap sudah diputuskan hanya karena tercantum sebagai kebutuhan.

Dokumentasi yang sudah ditinjau:

- [Supabase email/password](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 17. Target demo 9 hari — usulan prioritas

Ini rancangan pembagian waktu, belum komitmen bahwa seluruh fitur produk selesai dalam 27 jam. Untuk menjaga demo dapat diperagakan, hari 7–9 juga menyediakan ruang integrasi dan perbaikan; fitur yang belum berjalan harus diberi status jelas, bukan ditampilkan seolah berfungsi.

| Hari | Fokus yang diusulkan | Hasil yang ditinjau |
| --- | --- | --- |
| 1 | Fondasi aplikasi, model data inti, auth dan profil | Akun uji dapat masuk; akses lingkungan jelas |
| 2 | Listing, lokasi, feed dan pencarian | Penawaran uji dapat dibuat dan ditemukan sesuai area |
| 3 | Chat dan kartu kesepakatan | Dua akun berkomunikasi dalam konteks listing |
| 4 | Barter, revisi persetujuan, tambahan uang, reservasi | Demonstrasi dua pihak dari penawaran sampai penerimaan |
| 5 | PO, varian, kuota, DP dan pelunasan manual | Demonstrasi pesanan dengan DP dan serah terima |
| 6 | Toko, Plus dummy, visibilitas dan promosi dasar | Aktivasi/berakhirnya Plus dapat diperagakan |
| 7 | Jual beli/gratis dan integrasi status | Alur yang dapat memakai kembali komponen kesepakatan tersambung |
| 8 | Laporan/admin, ulasan dan notifikasi minimum | Laporan nyata dari data uji dapat dibuka dan ditangani |
| 9 | Pengujian lintas akun, mobile, perbaikan, naskah demo | Demo terintegrasi dengan daftar keterbatasan yang diketahui |

**Keputusan berikutnya:** menentukan alur mana yang wajib berjalan penuh pada hari ke-9 dan mana yang boleh tetap berupa rancangan jika waktu tidak cukup. Kandidat inti: barter dua pihak, PO dengan DP, serta aktivasi toko Plus dummy. Autentikasi, listing, chat, dan kontrol akses menjadi fondasi untuk kandidat tersebut.

Pengujian yang diprioritaskan:

- Mengubah barang/uang membatalkan persetujuan lama.
- Satu listing tidak dapat disepakati dua transaksi bersamaan.
- Dua pembeli tidak dapat mengambil kuota terakhir yang sama.
- Pengguna tidak bisa mengonfirmasi pembayaran sebagai pihak lain.
- Plus kedaluwarsa menyembunyikan toko tanpa menghilangkan transaksi berjalan.
- Profil/koordinat privat dan chat pengguna lain tidak terbuka melalui akses langsung.
- Laporan admin mempertahankan bukti dan keputusan tercatat.

## 18. Ukuran keberhasilan dan batas versi awal

Keberhasilan demo dinilai dari alur prioritas yang berjalan antarakun, konsistensi status, privasi akses, dan kemampuan diperagakan pada layar mobile. Target angka dan daftar alur wajib masih terbuka.

Metrik produk setelah pilot nyata: listing aktif per minggu per area, transaksi selesai menurut jenis, waktu respons chat, retensi pengguna, toko aktif, dan konversi Plus. Target angka ditentukan setelah profil pilot jelas.

Di luar versi awal:

- Pembayaran online/escrow untuk transaksi barang.
- Payment gateway nyata untuk Plus; saat ini dummy.
- Push notification dan aplikasi native.
- Pemesanan/pelacakan kurir otomatis.
- Akses staf toko.
- DP untuk barter.
- Penyuntingan/penarikan pesan chat.
- Pelaporan kepolisian otomatis.
- Peluncuran transaksi nyata pada hari ke-9.

## 19. Cara melanjutkan brainstorming

Prioritas pembahasan selanjutnya:

1. Alur demo yang wajib selesai dalam 27 jam.
2. Data listing/form toko, kategori, foto, stok non-PO, dan siklus batch PO.
3. Penyesuaian kesepakatan setelah reservasi atau DP sudah diterima.
4. Blokir, ban, sengketa, banding, dan pengembalian barang/dana.
5. Detail alamat dan pemulihan akun.
6. Aturan operasional tersisa dan kriteria penerimaan per alur.

Setelah keputusan tersebut cukup jelas, revisi PRD menjadi baseline yang disepakati lalu turunkan ke FRD: model data, state transition, otorisasi, API, pengujian, dan urutan implementasi. Belum ada kode aplikasi atau deployment yang dibuat sebagai bagian penyusunan draft ini.
