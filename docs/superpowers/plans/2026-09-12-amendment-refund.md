# Amendment and Refund Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-owned, auditable amendment and offline refund workflow without moving money or inventing DP/refund policy.

**Architecture:** Order amendments are immutable proposals against the current accepted revision. The first implementation permits seller-proposed amendments only before processing (`confirmed` or `awaiting_dp`); buyer acceptance atomically creates a new revision, releases the old outstanding obligations/holds, revalidates inventory, and records an explicit delta. Refund requests are separate from cancellation and fulfillment: an agreed party/admin amount is capped by acknowledged direct payments, then the sender records a transfer and the recipient confirms receipt. No RPC treats a click as money movement.

**Tech Stack:** Supabase PostgreSQL migrations, RLS, security-definer command functions with `auth.uid()` checks, React/TypeScript gateway and mobile pages, Vitest, pgTAP.

**Spec:** `docs/RFC-001-arsitektur-barter.md` §23, `docs/RFC-001-matriks-cakupan.md` R-131, R-148–R-156, T-49/T-50; `docs/PRD.md` transaction, moderation, and no-platform-payment requirements.

## Global Constraints

- The platform never receives, holds, routes, or reverses money; payment and refund actions are direct between parties.
- Existing order revisions, payment acknowledgements, cancellation history, and review evidence remain immutable.
- An amendment cannot be proposed after buyer receipt or while an active cancellation/dispute blocks the order.
- A refund amount must be explicit, positive, and no greater than acknowledged direct payments minus already confirmed refunds.
- Every mutating RPC requires an active account, participant/role authorization, expected revision where applicable, and idempotency key.
- Private ledger tables are RLS-enabled and inaccessible to browser table reads; browser writes go through scoped RPCs.
- Existing mobile-first copy must explain that payment/refund is outside Barter and dummy payment remains simulation-only.
- Runtime Supabase/pgTAP verification remains pending until a designated project or working local Docker engine is available.

---

### Task 1: Add failing contract tests for amendment and refund state

**Files:**
- Create: `supabase/tests/order_amendments_refunds.test.sql`
- Modify: `src/features/orders/gateway.test.ts`
- Modify: `src/features/orders/types.ts`

**Interfaces:**
- Produces database expectations for `propose_order_amendment`, `accept_order_amendment`, `reject_order_amendment`, `withdraw_order_amendment`, `propose_refund`, `accept_refund`, `record_refund_sent`, and `confirm_refund_received`.
- Produces frontend DTO shapes `amendment`, `refundRequests`, and command result types for later gateway/UI tasks.

- [x] **Step 1: Write pgTAP assertions first** for immutable amendment rows, one active proposal per order, participant RLS, refund cap constraints, sender/recipient separation, confirmation idempotency, and execute grants.
- [x] **Step 2: Add frontend gateway contract tests first** that expect RPC names and exact parameters for proposing/accepting an amendment and recording/confirming an offline refund.
- [x] **Step 3: Run the focused tests** with `npm.cmd test -- src/features/orders/gateway.test.ts --run`; the expected red state was observed before adding the gateway methods, then the focused tests passed after implementation.
- [x] **Step 4: Preserve the red-to-green contract work** in the implementation checkpoint commit; the tests were not committed separately because the gateway/types implementation followed in the same working session.

### Task 2: Implement order amendment proposal and acceptance

**Files:**
- Create: `supabase/migrations/20260912093000_order_amendments.sql`
- Modify: `supabase/tests/order_amendments_refunds.test.sql`
- Modify: `src/features/orders/gateway.ts`
- Modify: `src/features/orders/types.ts`
- Modify: `src/features/orders/OrderRoomPage.tsx`
- Create: `src/features/orders/OrderAmendmentPage.tsx`
- Create: `src/features/orders/OrderAmendmentPage.test.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- `public.propose_order_amendment(order_id uuid, expected_revision integer, items jsonb, handover_method text, handover_note text, shipping_amount text, dp_percent integer, dp_deadline timestamptz, reason text, idempotency_key uuid) returns jsonb`.
- `public.accept_order_amendment(amendment_id uuid, expected_revision integer, idempotency_key uuid) returns jsonb`.
- `public.reject_order_amendment(amendment_id uuid, expected_revision integer, idempotency_key uuid) returns jsonb`.
- `public.withdraw_order_amendment(amendment_id uuid, expected_revision integer, idempotency_key uuid) returns jsonb`.
- The DTO exposes `amendment` with `id`, `status`, `baseRevision`, `proposedRevision`, `proposerRole`, `reason`, `createdAt`, and `expiresAt`; accepted orders expose `settlement` with acknowledged, refunded, net, and still-due amounts.

- [x] **Step 1: Implement immutable tables** `public.order_amendments` with status/revision/expiry and a snapshot stored through immutable `order_revisions` + `order_items`; participant RLS exists and browser table grants are revoked.
- [x] **Step 2: Implement proposal validation** by locking the order, requiring seller actor, current revision, lifecycle `confirmed`/`awaiting_dp`, no received item and no pending cancellation, and validating proposed items/terms through the existing server-owned materialization rules.
- [x] **Step 3: Implement acceptance atomically** by locking order/amendment, checking current revision and buyer actor, revalidating the PO window and inventory, releasing old holds, creating the new immutable revision/items/obligations, updating accepted/current revision and lifecycle, and appending `order_amendment_accepted`.
- [x] **Step 4: Implement reject/withdraw** with role checks, expected revision, idempotent receipts, immutable status timestamps, and no mutation of the running contract.
- [x] **Step 5: Extend DTO/gateway and build the mobile amendment page** with current order summary plus proposal snapshot, explicit direct-payment warning, and buyer accept/reject or seller withdraw actions.
- [x] **Step 6: Add UI tests** for seller-only proposal form, proposal snapshot review, acceptance command, and no claim that payment happened; runtime stale-revision coverage remains in pgTAP/static SQL pending a database.
- [x] **Step 7: Run focused tests/build**; gateway, order-room, amendment, refund, full unit, build, and serial E2E checks pass while pgTAP remains static-only.
- [x] **Step 8: Include the implementation in the checkpoint commit** after documentation and executable checks.

### Task 3: Implement explicit offline refund ledger

**Files:**
- Create: `supabase/migrations/20260912094000_offline_refunds.sql`
- Modify: `supabase/tests/order_amendments_refunds.test.sql`
- Modify: `src/features/orders/gateway.ts`
- Modify: `src/features/orders/types.ts`
- Modify: `src/features/orders/OrderRoomPage.tsx`
- Create: `src/features/orders/RefundPage.tsx`
- Create: `src/features/orders/RefundPage.test.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- `public.propose_refund(order_id uuid, expected_revision integer, amount_rupiah bigint, reason text, basis text, idempotency_key uuid) returns jsonb`.
- `public.accept_refund(refund_request_id uuid, expected_revision integer, idempotency_key uuid) returns jsonb`.
- `public.record_refund_sent(refund_request_id uuid, expected_revision integer, proof_note text, idempotency_key uuid) returns jsonb`.
- `public.confirm_refund_received(refund_request_id uuid, expected_revision integer, idempotency_key uuid) returns jsonb`.
- A refund DTO exposes status `proposed|accepted|sent_unconfirmed|confirmed|rejected`, payer/payee roles, explicit amount, basis, and timestamps; it never exposes a fake gateway transaction id.

- [x] **Step 1: Implement tables** `public.refund_requests` and `public.refund_confirmations` with basis allowlist, direct payer/payee, amount, policy snapshot text, status, proof note, timestamps, participant RLS, and unique active request guard.
- [x] **Step 2: Implement server-side cap calculation** as acknowledged order payment obligations minus confirmed refunds; reject amount above cap and never count due/unacknowledged obligations.
- [x] **Step 3: Implement the four idempotent commands**: recipient accepts, payer records transfer without marking receipt, recipient confirms once, and duplicate commands return the prior DTO through the command receipt.
- [x] **Step 4: Add refund follow-up to order DTO and notification events** while preserving cancellation/fulfillment status as separate dimensions.
- [x] **Step 5: Build a mobile refund page** that labels every action as offline agreement/confirmation, asks for exact nominal and reason, shows cap/current status, and keeps disputes outside the money workflow.
- [x] **Step 6: Add UI/gateway tests** for cap display, direct-transfer copy, command mapping, and recipient confirmation surface; payer/recipient authorization is enforced by the RPC contract and static pgTAP.
- [x] **Step 7: Run focused tests, full tests, build, and E2E**; runtime SQL limitation is recorded in `docs/IMPLEMENTATION.md`.
- [x] **Step 8: Include the implementation in the checkpoint commit** after documentation and executable checks.

### Task 4: Documentation and verification checkpoint

**Files:**
- Modify: `docs/IMPLEMENTATION.md`
- Modify: `docs/RFC-001-matriks-cakupan.md` only if implementation evidence format is updated

- [x] **Step 1: Record migration names, RPC names, state invariants, and unresolved policy Q-12/Q-17 without marking runtime verification complete.**
- [x] **Step 2: Run `npm.cmd test -- --run`, `npm.cmd run build`, `npm.cmd run test:e2e -- --workers=1`, `npm.cmd audit --omit=dev`, and `git diff --check`.**
- [x] **Step 3: Run the pinned Supabase CLI and start local Supabase; `npm.cmd exec --yes --package=supabase@2.117.0 -- supabase --version` returns `2.117.0`, while `supabase start` remains blocked by the unavailable Docker Linux Engine.**
- [x] **Step 4: Prepare documentation for the implementation checkpoint after executable checks.**

## Self-review checklist

- No task assumes a refund policy that the product owner has not approved.
- Amendment acceptance does not overwrite old revisions or payment acknowledgements.
- Every public write is an authenticated, participant-scoped RPC and every private table has RLS plus revoked browser grants.
- UI language never says Barter processed, held, reversed, or guaranteed funds.
- The first implementation intentionally blocks amendments after processing; that open policy is documented rather than silently widened.
