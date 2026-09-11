# Kontrak API Discovery Publik

Status: provisional, 11 September 2026. Kontrak ini mendefinisikan bentuk data yang sudah dikonsumsi frontend. Implementasi RPC dan bukti RLS belum tersedia pada tahap fondasi frontend.

## Prinsip keamanan

- Semua endpoint di bawah bersifat baca publik dan hanya mengembalikan DTO eksplisit—bukan `select *` dari tabel internal.
- Koordinat presisi, alamat privat, nomor telepon, email, chat, bukti pembayaran, data moderasi, dan metadata EXIF tidak boleh masuk ke payload.
- `publicAddress` hanya berisi alamat yang pemilik toko pilih untuk dipublikasikan. Jika `publicAddressConsent` false, backend wajib mengembalikan null; frontend juga mengosongkannya sebagai pertahanan tambahan.
- Nominal rupiah dikirim sebagai string integer desimal canonical (`0` atau digit tanpa leading zero, maksimum 19 digit). Frontend tidak menghitung uang dengan floating point.
- Jarak adalah bilangan kilometer perkiraan nonnegatif yang dibulatkan oleh backend. Area adalah label publik, bukan hasil koordinat mentah.
- Cursor bersifat opaque, terikat pada filter dan urutan. Backend menolak cursor yang dipakai dengan query berbeda.

## RPC

| RPC | Argumen | Hasil |
| --- | --- | --- |
| `search_listings` | `p_query jsonb` | `ListingPage` |
| `get_listing` | `p_id uuid` | `PublicListing \| null` |
| `search_stores` | `p_query jsonb` | `StorePage` |
| `get_store` | `p_slug text` | `PublicStore \| null` |
| `get_store_listings` | `p_slug text`, `p_query jsonb` | `ListingPage` |

`p_query` memiliki bentuk berikut. `cursor` null pada halaman pertama.

```json
{
  "query": "kursi",
  "areaId": "depok",
  "radiusKm": 5,
  "category": "home",
  "mode": "sale",
  "fulfillment": "ready_stock",
  "minPrice": "50000",
  "maxPrice": "250000",
  "sort": "relevance",
  "cursor": null
}
```

Enum yang diterima:

- `mode`: `sale`, `barter`, `free`, atau null.
- `fulfillment`: `ready_stock`, `preorder`, `catering`, atau null.
- `sort`: `newest`, `nearest`, `relevance`.
- radius frontend saat ini: 5, 10, 20, atau 50 km. Backend tetap harus memvalidasi batas berdasarkan konfigurasi operasional.

## ListingPage

```json
{
  "items": ["PublicListing"],
  "nextCursor": "opaque-string-or-null"
}
```

Tidak ada total hasil yang difabrikasi. Frontend menampilkan tombol “Tampilkan lagi” hanya bila `nextCursor` tidak null.

## PublicListing

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "title": "Kursi kayu bekas",
  "description": "Masih kokoh dan bisa diperiksa saat bertemu.",
  "modes": ["sale", "barter"],
  "fulfillment": "ready_stock",
  "category": "home",
  "condition": "Bekas, layak pakai",
  "defects": "Gores tipis di kaki kanan",
  "priceMin": "150000",
  "priceMax": "150000",
  "unit": "barang",
  "negotiable": true,
  "barterPreferences": "Peralatan dapur",
  "area": { "id": "depok", "name": "Beji, Depok", "distanceKm": 2 },
  "publisher": {
    "id": "00000000-0000-4000-8000-000000000002",
    "name": "Dita",
    "storeSlug": null,
    "phoneVerified": false,
    "rating": null,
    "reviewCount": 0
  },
  "images": [
    { "url": "https://cdn.example.test/listing.webp", "alt": "Kursi kayu dari depan" }
  ],
  "variants": [],
  "preorder": null,
  "catering": null,
  "handoverMethods": ["meetup", "pickup"],
  "availability": "available",
  "promoted": false,
  "createdAt": "2026-09-11T08:00:00.000Z"
}
```

Aturan validasi utama:

- `title` 1–120 karakter, `images` maksimum 8.
- `modes` unik, maksimum 2. `free` eksklusif; `sale` dan `barter` boleh bersamaan.
- Listing `sale` wajib memiliki `priceMin` dan `priceMax`, dengan minimum tidak melebihi maksimum.
- `availability`: `available`, `reserved`, `sold`, atau `closed`. Feed publik hanya menampilkan available; detail dapat menjelaskan reserved/closed.
- `handoverMethods`: `pickup`, `meetup`, dan/atau `delivery`.
- Rating null berarti belum ada ulasan; verifikasi nomor bukan jaminan identitas.

`variants` berisi `{ id, name, price, unit }`. Untuk pre-order, `preorder` berisi ISO datetime `closesAt`/`availableAt`, integer positif `minimumQty`, `remainingQty` nonnegatif atau null, dan `dpPercent` 1–100 atau null. Untuk catering, `catering` berisi `minimumQty`, `leadTimeHours`, `serviceAreas[]`, dan `notes`.

## StorePage dan PublicStore

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000003",
      "slug": "dapur-bu-rina",
      "name": "Dapur Bu Rina",
      "description": "Masakan rumahan untuk pesanan lingkungan.",
      "category": "food",
      "area": { "id": "depok", "name": "Beji, Depok", "distanceKm": 3 },
      "hours": "Senin–Sabtu, 07.00–17.00 WIB",
      "handoverMethods": ["pickup", "delivery"],
      "publicAddress": null,
      "publicAddressConsent": false,
      "image": null,
      "rating": null,
      "reviewCount": 0
    }
  ],
  "nextCursor": null
}
```

Toko dan profil pribadi mempunyai reputasi terpisah. Keanggotaan Plus mengaktifkan toko/promosi, tetapi bukan tanda kepercayaan. Toko yang masa Plus-nya berakhir tidak muncul pada discovery atau promosi, sementara data transaksi historis tetap dipertahankan oleh domain internal.

## Respons error

Supabase mengembalikan error transport/otorisasi melalui field `error`; frontend menampilkan pesan generik berbahasa Indonesia dan tidak mengekspos detail server. Payload sukses yang tidak lolos schema Zod ditolak seluruhnya. `get_listing`/`get_store` boleh mengembalikan JSON null untuk not-found; error jaringan tidak boleh diubah menjadi null atau data contoh.

## Contoh pemeriksaan frontend

Kontrak ini diuji di `src/features/discovery/supabase-repository.test.ts`: transport HTTP Supabase dimock, sedangkan serialisasi RPC dan parsing DTO memakai client/adaptor sesungguhnya. Schema publik diuji di `src/features/discovery/types.test.ts`, termasuk penghapusan field tidak dikenal dan penolakan nominal yang tidak canonical.
