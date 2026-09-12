export type OrderItemInput = { variantId?: string; quantity: string };
export type OrderQuoteInput = { handoverMethod: 'pickup' | 'meetup' | 'delivery'; handoverNote: string; shippingAmountRupiah: string; dpPercent: number; dpDeadline: string | null; reason: string };
export type OrderItem = { id: string; listingId: string; variantId: string | null; name: string; unit: string; quantity: number; unitPriceRupiah: string; lineTotalRupiah: string };
import type { TransactionFollowUp } from '../shared/transaction-follow-up';

export type OrderPayment = { kind: 'dp' | 'balance' | 'shipping'; amountRupiah: string; state: 'due' | 'acknowledged' | 'cancelled'; dueAt: string | null };
export type OrderTerms = { handoverMethod: 'pickup' | 'meetup' | 'delivery'; handoverNote: string; shippingAmountRupiah: string; subtotalRupiah: string; totalRupiah: string; dpPercent: number; dpAmountRupiah: string; dpDeadline: string | null };
export type OrderAmendment = { id: string; status: 'proposed' | 'accepted' | 'rejected' | 'withdrawn'; baseRevision: number; proposedRevision: number; proposerRole: 'buyer' | 'seller'; reason: string; createdAt: string; expiresAt: string | null; items?: OrderItem[]; terms?: OrderTerms };
export type RefundRequest = { id: string; status: 'proposed' | 'accepted' | 'sent_unconfirmed' | 'confirmed' | 'rejected'; basis: 'amendment' | 'cancellation' | 'admin_decision'; amountRupiah: string; payerRole: 'buyer' | 'seller'; recipientRole: 'buyer' | 'seller'; reason: string; proofNote: string | null; createdAt: string; acceptedAt: string | null; sentAt: string | null; confirmedAt: string | null };
export type OrderSettlement = { acknowledgedRupiah: string; confirmedRefundRupiah: string; netReceivedRupiah: string; amountStillDueRupiah: string; refundCapRupiah: string };
export type OrderRoom = {
  id: string; conversationId: string; listingId: string; kind: 'sale' | 'free'; lifecycle: 'quoted' | 'confirmed' | 'awaiting_dp' | 'processing' | 'ready' | 'awaiting_receipt' | 'completed' | 'cancelled';
  revision: number; acceptedRevision: number | null; actorRole: 'buyer' | 'seller'; buyer: { id: string; name: string }; seller: { id: string; name: string };
  items: OrderItem[]; terms: OrderTerms;
  payments: OrderPayment[]; fulfillment: { processingAt: string | null; readyAt: string | null; handedAt: string | null; receivedAt: string | null }; receiptFollowUp?: TransactionFollowUp | null; cancellationReason: string | null; cancellationRequest: { id: string; requestedBy: 'buyer' | 'seller'; reason: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string } | null; refundFollowUpRequired: boolean; amendment?: OrderAmendment | null; refunds?: RefundRequest[]; settlement?: OrderSettlement; updatedAt: string;
};
