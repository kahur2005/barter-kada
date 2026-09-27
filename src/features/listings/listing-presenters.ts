import type { FulfillmentKind, ListingMode } from '../discovery/types';
import type { HandoverMethod, ListingCondition } from './types';

export type ListingStage = 0 | 1 | 2 | 3;

export const listingStages = ['Penawaran', 'Detail', 'Ketersediaan', 'Tinjau'] as const;

const detailFields = [
  'title',
  'description',
  'condition',
  'defects',
  'basePriceRupiah',
  'negotiable',
  'barter',
  'variants',
  'assetIds',
];

const availabilityFields = ['handoverMethods', 'preorder', 'catering'];

function ownsField(fields: string[], field: string) {
  return fields.some(prefix => field === prefix || field.startsWith(`${prefix}.`));
}

export function stageForListingField(field: string): ListingStage {
  if (ownsField(detailFields, field)) return 1;
  if (ownsField(availabilityFields, field)) return 2;
  if (field === 'form') return 3;
  return 0;
}

export function formatRupiah(value: string | null): string {
  if (!value || !/^\d+$/.test(value)) return 'Harga belum diisi';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(BigInt(value));
}

const conditions: Record<ListingCondition, string> = {
  new: 'Baru',
  like_new: 'Seperti baru',
  good: 'Baik',
  fair: 'Cukup',
  needs_repair: 'Perlu perbaikan',
};

export function conditionLabel(value: ListingCondition | null): string {
  return value ? conditions[value] : 'Tidak berlaku';
}

const fulfillment: Record<FulfillmentKind, string> = {
  ready_stock: 'Ready stock',
  preorder: 'Pre-order',
  catering: 'Catering',
};

export function fulfillmentLabel(value: FulfillmentKind): string {
  return fulfillment[value];
}

const handovers: Record<HandoverMethod, string> = {
  pickup: 'Diambil',
  meetup: 'Meet up',
  delivery: 'Diantar',
};

export function handoverLabel(values: HandoverMethod[]): string {
  return values.length > 0 ? values.map(value => handovers[value]).join(' · ') : 'Belum dipilih';
}

const modes: Record<ListingMode, string> = {
  sale: 'Jual',
  barter: 'Barter',
  free: 'Gratis',
};

export function modeLabel(values: ListingMode[]): string {
  return values.length > 0 ? values.map(value => modes[value]).join(' · ') : 'Belum dipilih';
}
