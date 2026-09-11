import type { ListingDraft, ListingValidationIssue } from './types';

const ACTIVE_CATEGORIES = new Set(['food', 'clothing', 'home', 'vehicles', 'garden', 'other']);
const AMOUNT = /^(0|[1-9]\d{0,18})$/;
const POSITIVE_QUANTITY = /^[1-9]\d{0,8}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateListingDraft(draft: ListingDraft, options: { intent: 'draft' | 'publish'; now: Date }): ListingValidationIssue[] {
  const issues: ListingValidationIssue[] = [];
  const publish = options.intent === 'publish';
  const add = (field: string, message: string) => issues.push({ field, message });
  const modes = new Set(draft.modes);
  const free = modes.has('free'); const sale = modes.has('sale'); const barter = modes.has('barter');

  if (draft.modes.length === 0 || modes.size !== draft.modes.length || (free && draft.modes.length !== 1) || draft.modes.length > 2) add('modes', 'Pilih kombinasi jenis penawaran yang diizinkan.');
  if (draft.fulfillment !== 'ready_stock' && (draft.modes.length !== 1 || !sale)) add('fulfillment', 'PO dan catering hanya dapat memakai jenis Jual.');
  if (!sale && draft.negotiable) add('negotiable', 'Pilihan harga bisa ditawar hanya berlaku untuk penjualan.');

  const hasBasePrice = draft.basePriceRupiah !== null && draft.basePriceRupiah !== '';
  if (hasBasePrice && (!AMOUNT.test(draft.basePriceRupiah!) || BigInt(draft.basePriceRupiah!) <= 0n)) add('basePriceRupiah', 'Harga harus bilangan bulat rupiah lebih dari nol.');
  if (free && (hasBasePrice || draft.variants.length > 0)) add('basePriceRupiah', 'Barang gratis tidak memiliki harga barang.');
  if (publish && sale && !hasBasePrice && draft.variants.length === 0) add('basePriceRupiah', 'Isi harga utama atau sedikitnya satu varian berharga.');

  if (barter) {
    if (publish && !draft.barter) add('barter', 'Isi preferensi barter.');
    if (draft.barter && !draft.barter.openToOffers && draft.barter.wantedDescription.trim().length < 3) add('barter.wantedDescription', 'Jelaskan barang yang ingin ditukar.');
  } else if (draft.barter) add('barter', 'Hapus preferensi barter bila jenis Barter tidak dipilih.');

  if (draft.title.length > 120 || (publish && draft.title.trim().length < 3)) add('title', 'Nama penawaran harus 3–120 karakter.');
  if (draft.description.length > 5_000 || (publish && draft.description.trim().length < 10)) add('description', 'Detail penawaran harus 10–5.000 karakter.');
  if (draft.categoryId && !ACTIVE_CATEGORIES.has(draft.categoryId)) add('categoryId', 'Kategori tidak tersedia.');
  if (publish && !ACTIVE_CATEGORIES.has(draft.categoryId)) add('categoryId', 'Pilih kategori.');

  const needsCondition = !['food', 'garden'].includes(draft.categoryId) && draft.fulfillment === 'ready_stock';
  if (publish && needsCondition && !draft.condition) add('condition', 'Pilih kondisi barang.');
  if (draft.defects.length > 1_000 || (publish && needsCondition && draft.defects.trim().length < 3)) add('defects', 'Jelaskan kekurangan atau nyatakan tidak ada kekurangan yang diketahui.');

  if (draft.assetIds.length > 8 || draft.assetIds.some(id => !UUID.test(id)) || (publish && draft.assetIds.length === 0)) add('assetIds', 'Tambahkan 1–8 foto yang sudah selesai diproses.');
  if (publish && draft.handoverMethods.length === 0) add('handoverMethods', 'Pilih sedikitnya satu cara penyerahan.');
  if (new Set(draft.handoverMethods).size !== draft.handoverMethods.length) add('handoverMethods', 'Cara penyerahan tidak boleh berulang.');

  if (draft.variants.length > 20) add('variants', 'Maksimal 20 varian per listing.');
  const labels = draft.variants.map(variant => variant.label.trim().toLocaleLowerCase('id-ID'));
  if (new Set(labels).size !== labels.length) add('variants', 'Nama varian harus unik.');
  draft.variants.forEach((variant, index) => {
    if (variant.label.trim().length < 1 || variant.label.length > 80) add(`variants.${index}.label`, 'Nama varian wajib diisi.');
    if (variant.unit.trim().length < 1 || variant.unit.length > 30) add(`variants.${index}.unit`, 'Satuan varian wajib diisi.');
    if (!AMOUNT.test(variant.priceRupiah) || BigInt(variant.priceRupiah) <= 0n) add(`variants.${index}.priceRupiah`, 'Harga varian harus rupiah bulat lebih dari nol.');
  });

  if (draft.fulfillment === 'preorder') {
    if (publish && !draft.preorder) add('preorder', 'Lengkapi ketentuan pre-order.');
    if (draft.catering) add('catering', 'Ketentuan catering tidak berlaku pada pre-order.');
    const terms = draft.preorder;
    if (terms) {
      const closes = Date.parse(terms.orderClosesAt); const fulfills = Date.parse(terms.fulfillmentAt);
      if (!Number.isFinite(closes) || closes <= options.now.getTime()) add('preorder.orderClosesAt', 'Batas pemesanan harus berada di masa depan.');
      if (!Number.isFinite(fulfills) || !Number.isFinite(closes) || fulfills <= closes) add('preorder.fulfillmentAt', 'Jadwal tersedia harus setelah batas pemesanan.');
      if (!POSITIVE_QUANTITY.test(terms.minimumQty)) add('preorder.minimumQty', 'Minimum pesanan harus bilangan bulat positif.');
      if (!/^\d{1,3}$/.test(terms.dpPercent) || Number(terms.dpPercent) > 100) add('preorder.dpPercent', 'DP harus 0–100%.');
      if (terms.quotaMode === 'shared' && (!terms.sharedQuota || !POSITIVE_QUANTITY.test(terms.sharedQuota))) add('preorder.sharedQuota', 'Kuota bersama harus bilangan bulat positif.');
      if (terms.quotaMode === 'per_variant') draft.variants.forEach((variant, index) => { if (!variant.quota || !POSITIVE_QUANTITY.test(variant.quota)) add(`variants.${index}.quota`, 'Isi kuota positif untuk setiap varian.'); });
    }
  } else if (draft.preorder) add('preorder', 'Hapus ketentuan pre-order untuk bentuk penawaran ini.');

  if (draft.fulfillment === 'catering') {
    if (publish && !draft.catering) add('catering', 'Lengkapi ketentuan catering.');
    const terms = draft.catering;
    if (terms) {
      if (!POSITIVE_QUANTITY.test(terms.minimumQty)) add('catering.minimumQty', 'Minimum catering harus bilangan bulat positif.');
      if (!POSITIVE_QUANTITY.test(terms.leadTimeHours)) add('catering.leadTimeHours', 'Waktu persiapan harus dalam jam positif.');
      if (terms.unit.trim().length === 0) add('catering.unit', 'Satuan catering wajib diisi.');
      if (publish && terms.serviceAreaIds.length === 0) add('catering.serviceAreaIds', 'Pilih area layanan catering.');
      if (terms.availabilityNotes.length > 500) add('catering.availabilityNotes', 'Catatan ketersediaan maksimal 500 karakter.');
    }
  } else if (draft.catering) add('catering', 'Hapus ketentuan catering untuk bentuk penawaran ini.');

  return issues;
}
