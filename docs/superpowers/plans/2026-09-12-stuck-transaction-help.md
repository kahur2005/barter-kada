# Rencana: transaksi menggantung dan bantuan admin

## Tujuan

Memenuhi alur PRD 14.3/R-185–R-189 tanpa membuat transaksi selesai otomatis: setelah penerimaan/penyerahan pertama, sistem mengirim satu reminder in-app setelah 24 jam; setelah 72 jam, pihak yang berhak dapat meminta bantuan admin. Kasus bantuan tetap menjadi laporan scoped, dan keputusan admin tidak menyamar sebagai receipt atau pembayaran.

## Langkah implementasi

1. Tambahkan kontrak server untuk status follow-up pada DTO barter dan pesanan. Status dihitung dari timestamp server dan laporan yang sudah ada, bukan dari jam klien.
2. Tambahkan RPC `request_admin_help` yang mengunci target, memvalidasi participant/role, batas 72 jam, status transaksi, dan mencegah dua kasus bantuan aktif untuk target yang sama.
3. Perluas `system_jobs` dengan reminder penerimaan/penyerahan 24 jam untuk barter dan pesanan; handler memeriksa ulang state sebelum membuat notifikasi dan tetap idempoten.
4. Tambahkan gateway dan UI mobile untuk menampilkan banner transaksi menggantung serta dialog alasan bantuan admin. Aksi laporan biasa tetap tersedia kapan saja.
5. Tulis assertion pgTAP untuk queue kind, trigger, RPC privilege/security, dan field DTO; tambah test React untuk visibility/validation serta gateway payload.
6. Jalankan unit test, build, E2E, audit, `git diff --check`; dokumentasikan keterbatasan bahwa migration belum dapat dieksekusi jika Docker API tetap hang.
