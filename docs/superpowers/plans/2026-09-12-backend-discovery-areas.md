# Backend-Driven Discovery Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Make the discovery area picker read enabled service areas from the Supabase backend while preserving the existing synthetic area list in explicit preview mode.

**Architecture:** Extend the read-only `DiscoveryRepository` with a typed `listAreas()` method. The Supabase adapter reads `public.service_areas` through the existing RLS-safe Data API; the preview adapter returns the existing five synthetic options. `DiscoveryPage` loads the options before querying discovery and passes them to `AreaPicker`, while URL parsing remains backward-compatible with the existing `depok` default and filter tests.

**Tech Stack:** React 19, TypeScript, TanStack Query, Supabase JS, Zod, Vitest.

**Spec:** `docs/PRD.md` (hyperlocal Jabodetabek discovery), `docs/RFC-001-arsitektur-barter.md` (backend-owned service areas), `docs/PDR-001-desain-produk.md` (mobile area picker), and `docs/contracts/discovery-api.md`.

## Global Constraints

- Default runtime uses Supabase; preview data is synthetic and must never claim persistence or transactions.
- Only enabled, public-safe `service_areas` rows are exposed to the browser.
- Location precision and private addresses remain server-owned; this slice reads names and IDs only.
- Do not add automatic device geolocation or retain coordinates in the URL.
- Do not change migrations, seed data, or import external boundary data in this slice.

---

### Task 1: Add the read-only area contract and adapters

**Files:**
- Modify: `src/features/discovery/repository.ts`
- Modify: `src/features/discovery/preview-repository.ts`
- Modify: `src/features/discovery/supabase-repository.ts`
- Modify: `src/features/discovery/supabase-repository.test.ts`

**Interfaces:**
- Produces `DiscoveryRepository.listAreas(signal?: AbortSignal): Promise<Array<{ areaId: string; name: string }>>`.
- Supabase selects `area_id,name` from `public.service_areas`, filters `enabled = true`, orders by `name`.
- Preview returns the existing `areas` fixture list without contacting Supabase.

- [x] **Step 1: Write the failing adapter tests**

Add tests proving the Supabase adapter sends a public table read with `area_id,name`, applies the enabled filter and name ordering, and parses `{ area_id, name }` into `{ areaId, name }`. Add a test that rejects malformed area rows.

- [x] **Step 2: Run the focused tests and verify they fail**

Run: `npm.cmd test -- src/features/discovery/supabase-repository.test.ts`

Expected: FAIL because `listAreas` is not yet part of the repository contract/adapter.

- [x] **Step 3: Implement the minimal contract and adapters**

Import the shared `areas` list in the preview adapter. In the Supabase adapter, add a Zod row schema and a `listAreas` method using the existing client. Convert Supabase errors to the same readable connection error used by RPC calls; parse the response before returning it.

- [x] **Step 4: Run the focused tests**

Run: `npm.cmd test -- src/features/discovery/supabase-repository.test.ts`

Expected: PASS.

### Task 2: Render backend-driven options in discovery

**Files:**
- Modify: `src/features/discovery/DiscoveryPage.tsx`
- Modify: `src/features/discovery/AreaPicker.tsx`
- Modify: `src/features/discovery/DiscoveryPage.test.tsx` (create if absent)
- Modify: `src/features/discovery/filters.ts` only if needed to preserve parser behavior

**Interfaces:**
- `DiscoveryPage` owns a TanStack Query for `repo.listAreas()` and passes the resolved options to `AreaPicker`.
- `AreaPicker` accepts `areas: Array<{ areaId: string; name: string }>` and renders those options.
- Preview keeps the current five options; Supabase exposes every enabled backend area.

- [x] **Step 1: Write the failing component test**

Render `DiscoveryPage` with a repository whose `listAreas` resolves to `Depok`, `Kota Adm. Jakarta Selatan`, and `Kota Bekasi`; assert all three labels appear in the area dialog after opening it. Assert the preview repository still exposes its five synthetic options.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npm.cmd test -- src/features/discovery/DiscoveryPage.test.tsx`

Expected: FAIL because `AreaPicker` currently imports and renders the hardcoded five-area list.

- [x] **Step 3: Implement loading and rendering**

Use `useQuery` with a repository-scoped key. Keep discovery results disabled until area options are loaded; if the area request fails, show a readable error panel rather than querying with an unknown area. Pass the options to `AreaPicker` and keep the current area label fallback for legacy URLs.

- [x] **Step 4: Run focused component tests**

Run: `npm.cmd test -- src/features/discovery/DiscoveryPage.test.tsx src/features/discovery/filters.test.ts`

Expected: PASS.

### Task 3: Full verification and documentation

**Files:**
- Modify: `docs/IMPLEMENTATION.md`

- [x] **Step 1: Run typecheck, all unit tests, and production build**

Run: `npm.cmd run typecheck; npm.cmd test -- --run; npm.cmd run build`

Expected: all commands exit 0.

- [x] **Step 2: Verify the preview UI**

Run the existing preview E2E suite with `CI=1 npm.cmd run test:e2e -- --workers=1`; verify area dialog behavior remains covered at mobile and desktop widths.

- [x] **Step 3: Update implementation evidence**

Record the new repository contract, tests, and the explicit limitation that live Supabase area discovery remains empty until the separately approved BIG boundary import is applied.

- [x] **Step 4: Review the diff**

Run `git diff --check` and `git status --short`; confirm no `.env` values, boundary polygons, or unrelated files were changed.
