# Orders and preorder implementation plan

## Goal

Add the first real sale, free-giveaway, catering, and preorder transaction path without pretending Barter processes money. A seller creates a quote from a listing conversation; the buyer confirms the immutable snapshot; both parties record manual payment and handover confirmations in the transaction room.

## Scope for this slice

- A private `orders` aggregate tied to one listing conversation and two users.
- Immutable quote revisions with listing/variant/quantity/price, handover method, pickup note, subtotal, shipping amount, and DP snapshot.
- Server-side minimum quantity, open-PO window, optional shared quota, and exclusive ready-stock reservation checks.
- Seller-only quote creation/revision and seller/buyer confirmation actions guarded by idempotency keys.
- Manual DP and balance acknowledgement by the seller; no payment provider or balance ledger.
- Seller marks processing/ready/handed over; buyer confirms receipt; completion requires the relevant manual payment and handover states.
- Mobile buyer order page and seller quote form linked from the existing chat/listing surface.

## Invariants

- Browser has no direct DML on order tables.
- Every mutation derives actor and listing owner from `auth.uid()` and locks the order, quote, and inventory rows in a stable order.
- Quote changes create a new revision and invalidate buyer confirmation; old snapshots remain readable to participants.
- The amount shown to either party is the server snapshot, never a current listing price reread after confirmation.
- DP is a manual obligation: only the payee/seller can acknowledge receipt; an unacknowledged DP blocks processing.
- A free order has a zero goods subtotal but can retain a separately agreed shipping amount.
- A PO cannot be confirmed after its close time, below its minimum quantity, or above its held/consumed capacity.

## TDD sequence

1. Add migration and pgTAP tests for order tables, RLS, quote revision, minimum/quota, DP guard, handover, completion, cancellation, and idempotency.
2. Add typed order gateway and parser tests.
3. Add seller quote and buyer order-room components with tests for disabled/invalid state and manual-payment labels.
4. Add routes and honest unavailable fallback when no backend gateway is configured.
5. Run unit tests, typecheck, build, audit, and existing E2E; document Docker/Supabase runtime limitations.

## Deferred

Amendments after DP/processing, refund entitlement policy, delivery tracking, notification jobs, multi-listing cart, and admin dispute tooling remain separate slices. They must not be simulated by silently mutating an accepted quote.
