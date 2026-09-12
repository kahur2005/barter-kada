# Notifications and reviews vertical slice

## Goal

Replace the notifications placeholder and add post-completion reputation for barter and sale/free/PO/catering orders without inventing payment or delivery state.

## Decisions carried into implementation

- Notifications are an in-app center only. Push notifications are out of scope.
- Notification rows are recipient-private and are created server-side from committed chat, barter, order, Plus, and report events where the event source already exists.
- A review is allowed once per actor per completed transaction. The server derives the counterpart; the client cannot choose an arbitrary target.
- Rating is 1–5 with an optional 10–1,000 character comment. Reviews are public after completion. The reviewed person may post one reply.
- Review submission is deliberately a separate step after completion and never changes transaction state.
- Preview mode stays honest: no synthetic notifications, reviews, or transaction completion are shown.

## Delivery order

1. Add failing gateway/UI tests for notification list/read and review submission.
2. Add Supabase migration with private notification writer, event triggers, notification RPCs, review constraints, completion validation, and RLS.
3. Add typed gateways, providers, routes, and mobile pages.
4. Add completion links to barter/order rooms and update docs/evidence.
5. Run typecheck, unit tests, build, E2E, and static SQL review. Record Docker/Supabase runtime limitation explicitly.

## Deferred

- Admin review moderation, review reports, replies UI, profile review pages, sanctions, and aggregate reputation DTOs are separate moderation/profile work.
- Order amendment, refund, and cancellation policy remain separate because they alter inventory and payment-obligation state.
