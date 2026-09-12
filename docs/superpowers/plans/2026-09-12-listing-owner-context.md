# Rencana: konteks penerbit pada Listing saya

Status: selesai di branch `feat/barter-webapp`; belum dipush.

## Tujuan

Menampilkan apakah listing diterbitkan dari profil pribadi atau toko tertentu pada halaman owner, sehingga katalog beberapa toko dapat dikelola tanpa menebak dari judul.

## Keputusan implementasi

- `get_my_listings()` mengembalikan publisher context dari server: `personal`, atau `store` dengan `storeId`, `storeName`, dan `storeSlug`.
- Projection tetap owner-scoped dan tidak membuka listing draft/arsip kepada pengguna lain.
- Tidak mengubah identitas listing, URL edit, atau snapshot transaksi.
- Client tetap kompatibel terhadap response lama tanpa publisher dengan fallback `Profil pribadi`.

## Langkah

1. Tambahkan test UI dan assertion SQL untuk publisher context.
2. Tambahkan field tipe, projection server, dan label pada kartu listing.
3. Jalankan unit test, build, E2E, audit, lalu commit lokal.
