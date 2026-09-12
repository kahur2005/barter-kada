import type { TransactionFollowUp } from '../shared/transaction-follow-up';

export type TradeItemInput =
  | { clientId: string; source: 'listing'; listingId: string }
  | { clientId: string; source: 'direct'; name: string; details: string; quantity: string; assetIds: string[] };

export type TradeTopupInput = { payerId: string; amountRupiah: string } | null;

export type TradePhoto = { assetId?: string; bucket: 'listing-media' | 'chat-media'; path: string; url?: string };
export type TradeItem = {
  id: string;
  offeredBy: string;
  source: 'listing' | 'direct';
  listingId: string | null;
  name: string;
  details: string;
  quantity: number;
  photos: TradePhoto[];
};

export type TradeParty = { id: string; name: string };
export type TradeRoom = {
  id: string;
  conversationId: string;
  lifecycle: 'negotiating' | 'agreed' | 'completed' | 'cancelled';
  revision: number;
  acceptedRevision: number | null;
  rowVersion: number;
  actor: TradeParty;
  counterpart: TradeParty;
  ownItems: TradeItem[];
  counterpartItems: TradeItem[];
  topup: { payerId: string; payeeId: string; amountRupiah: string; acknowledged: boolean } | null;
  readiness: { actor: boolean; counterpart: boolean };
  approvals: { actor: boolean; counterpart: boolean };
  receipts: { actorReceived: boolean; counterpartReceived: boolean };
  receiptFollowUp?: TransactionFollowUp | null;
  cancellationReason: string | null;
  updatedAt: string;
};
