import type { FulfillmentKind, ListingMode } from '../discovery/types';

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'needs_repair';
export type HandoverMethod = 'pickup' | 'meetup' | 'delivery';
export type ListingVariantDraft = { clientId: string; label: string; unit: string; priceRupiah: string; quota: string | null };
export type ListingDraft = {
  listingId: string | null;
  expectedVersion: number | null;
  publisher: { kind: 'personal' } | { kind: 'store'; storeId: string };
  modes: ListingMode[];
  fulfillment: FulfillmentKind;
  categoryId: string;
  title: string;
  description: string;
  condition: ListingCondition | null;
  defects: string;
  negotiable: boolean;
  barter: { openToOffers: boolean; wantedDescription: string } | null;
  basePriceRupiah: string | null;
  variants: ListingVariantDraft[];
  assetIds: string[];
  handoverMethods: HandoverMethod[];
  preorder: null | {
    orderClosesAt: string;
    fulfillmentAt: string;
    minimumQty: string;
    quotaMode: 'unlimited' | 'shared' | 'per_variant';
    sharedQuota: string | null;
    dpPercent: string;
  };
  catering: null | {
    minimumQty: string;
    unit: string;
    leadTimeHours: string;
    serviceAreaIds: string[];
    availabilityNotes: string;
  };
};

export type ListingValidationIssue = { field: string; message: string };
