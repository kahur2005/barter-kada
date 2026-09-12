export type OrderItemInput = { variantId?: string; quantity: string };
export type OrderQuoteInput = { handoverMethod: 'pickup' | 'meetup' | 'delivery'; handoverNote: string; shippingAmountRupiah: string; dpPercent: number; dpDeadline: string | null; reason: string };
export type OrderItem = { id: string; listingId: string; variantId: string | null; name: string; unit: string; quantity: number; unitPriceRupiah: string; lineTotalRupiah: string };
export type OrderPayment = { kind: 'dp' | 'balance' | 'shipping'; amountRupiah: string; state: 'due' | 'acknowledged' | 'cancelled'; dueAt: string | null };
export type OrderRoom = {
  id: string; conversationId: string; listingId: string; kind: 'sale' | 'free'; lifecycle: 'quoted' | 'confirmed' | 'awaiting_dp' | 'processing' | 'ready' | 'awaiting_receipt' | 'completed' | 'cancelled';
  revision: number; acceptedRevision: number | null; actorRole: 'buyer' | 'seller'; buyer: { id: string; name: string }; seller: { id: string; name: string };
  items: OrderItem[]; terms: { handoverMethod: 'pickup' | 'meetup' | 'delivery'; handoverNote: string; shippingAmountRupiah: string; subtotalRupiah: string; totalRupiah: string; dpPercent: number; dpAmountRupiah: string; dpDeadline: string | null };
  payments: OrderPayment[]; fulfillment: { processingAt: string | null; readyAt: string | null; handedAt: string | null; receivedAt: string | null }; cancellationReason: string | null; cancellationRequest: { id: string; requestedBy: 'buyer' | 'seller'; reason: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string } | null; refundFollowUpRequired: boolean; updatedAt: string;
};
