# Listing Publishing and Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:test-driven-development per task and verification-before-completion before commits.

**Goal:** Let a completed account create, save, publish, revise, list, and archive personal or store-backed sale/barter/free/PO/catering listings while preserving privacy, inventory invariants, and public discovery contracts.

**Architecture:** React owns a four-step, server-authoritative wizard backed by a `ListingGateway`. Supabase command RPCs—not direct table DML—validate ownership, plan limits, modes, lifecycle, versions, variants, and fulfillment terms. Public discovery reads a deliberately safe projection derived from the publisher location. Media enters a private quarantine path and becomes publishable only after server processing removes metadata.

**Spec:** PRD §§6–8, 11; RFC §§6.1, 7, 8, 12, 21; PDR UI-04; T-11, T-12, T-22–T-28, T-34–T-35, T-46.

## Decisions used for this implementation

- RFC draft taxonomy is used and stays versioned: food, clothing, home/furniture, vehicles, garden, other. It is not represented as a final product decision.
- D-11 is enforced: up to eight JPEG/PNG/WebP images, at most 5 MB each. Publish requires at least one processed photo; drafts may be incomplete.
- Free is exclusive. PO/catering are sale-only. Ready-stock supports sale, barter, sale+barter, or free.
- Preloved condition is `new | like_new | good | fair | needs_repair`; food/garden listings use freshness/availability copy instead of a misleading used-item condition.
- Money is integer rupiah serialized as decimal strings at the browser boundary. Variants have unique labels and explicit units/prices.
- A listing keeps its publisher identity once a transaction snapshot exists. Store selection remains personal-only until the Plus/store subsystem produces eligible stores.
- Exclusive ready-stock inventory starts at capacity one. PO inventory and order holds are implemented with the order subsystem; listing publication creates the batch/pool model without claiming concurrency proof while SQL cannot run.
- Service-area polygons and exact locations remain private. Public projections expose `area_id`, approximate grid label, and rounded distance only.

## Task 1 — Domain model and validation

**Files:** `src/features/listings/types.ts`, `validation.ts`, tests.

- [ ] Write RED tests for all mode/fulfillment combinations, price/barter requirements, condition/category rules, variants, photo limits, PO schedule/minimum/quota/DP, and draft-vs-publish behavior.
- [ ] Implement discriminated validation returning stable `{field, message}` issues without coercing invalid combinations.
- [ ] Test money beyond JS safe integer and snapshot serialization as decimal strings.

## Task 2 — Four-step publishing UI and owner list

**Files:** listing context/gateway, `ListingEditorPage`, `MyListingsPage`, route/styles/E2E.

- [ ] Test Penawaran → Detail → Ketersediaan → Tinjau with persistent labels, retained input, server error summary/focus, Save draft from every step, and explicit publish confirmation.
- [ ] Implement publisher/mode/category/fulfillment step. Personal publishing is always available; store choice explains Plus without paywalling PO/catering.
- [ ] Implement text, condition/defects, barter preferences, price/variants, photo queue, PO/catering, fulfillment options, and review preview.
- [ ] Implement owner tabs Active/Draft/Archive/Complete and server-provided quota counter; reserved actions show a reason rather than silently enabling edit/archive.
- [ ] Add before-unload and in-app leave confirmation for dirty unsaved fields; never discard text because one upload failed.

## Task 3 — Supabase schema, command RPCs, and RLS

**Files:** timestamped migration and pgTAP tests.

- [ ] Create RED pgTAP tests for ownership, free exclusivity, sale pricing, active limit 20, stale versions, store ownership, lifecycle, and archive visibility.
- [ ] Add categories/rules, listings/modes/variants/fulfillment/preorder batches/inventory pools, private asset records, and safe discovery projection.
- [ ] Implement `save_listing_draft`, `publish_listing`, `revise_listing`, `archive_listing`, `get_my_listings`, and public discovery/detail commands. Browser roles receive no direct DML.
- [ ] Lock owner quota when publishing; check account `active`; enforce optimistic `expected_version`; archive without deleting history.
- [ ] Derive approximate location/search fields on the server. Never accept another user's arbitrary location or return exact coordinates/address.

## Task 4 — Media quarantine and metadata removal

**Files:** storage policies, `process-listing-image` Edge Function, adapter/tests.

- [ ] Test content type, byte limit, ownership, idempotency, malformed image, and metadata-bearing fixtures.
- [ ] Upload only to owner-scoped private quarantine via signed path; process server-side into a new object; discard original after verified output.
- [ ] Decode/re-encode JPEG/PNG/WebP so EXIF/GPS and hidden payload metadata do not survive. Mark asset `processed` only after dimensions/hash/type checks.
- [ ] Public projection returns only processed asset URLs; transaction snapshots retain immutable references.

## Task 5 — Integration and verification

- [ ] Connect normal-mode `ListingGateway` to RPC/storage; preview mode may demonstrate the form but must label saves as local-only and never claim publication.
- [ ] Run unit, build, Playwright 320/390/1280, keyboard/reflow and secret scans.
- [ ] When Docker/Deno are available, run reset, pgTAP, advisors, Edge smoke tests, direct REST/RLS attacks, stale-version and concurrent-last-slot tests.
- [ ] Update implementation ledger with exact evidence. Commit locally; do not push/deploy without user instruction.

## External verification gates

- Docker Engine and Deno remain unavailable on the current host.
- No Barter Supabase cloud project is designated.
- Authoritative Jabodetabek polygons and a safe media-processing runtime must be supplied/verified before real publication can be called complete.
