# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the mobile-first React application foundation and usable read-only discovery, listing detail and store catalogue, ready to consume Supabase without pretending the remaining business flows are implemented.

**Architecture:** React SPA with React Router, TanStack Query and a typed discovery repository. Explicit preview mode supplies synthetic read-only fixtures; the normal runtime calls Supabase RPC and fails visibly when unconfigured. Server-owned data/permissions remain authoritative; no localStorage marketplace database.

**Tech Stack:** React, TypeScript, Vite, React Router, TanStack Query, Zod, Supabase JS, Vitest/Testing Library, Playwright, plain token CSS. Pin resolved package versions; inspect current official docs before relying on unfamiliar APIs.

**Spec:** `docs/PRD.md`, `docs/RFC-001-arsitektur-barter.md`, `docs/PDR-001-desain-produk.md`. Overall work remains tracked in `docs/IMPLEMENTATION.md`; this task does not fulfill the overall app objective by itself.

## Global Constraints

- Latar putih, section abu-abu ringan, judul tautan ungu-indigo; list satu kolom, bukan hero atau grid marketplace.
- Token: paper #FFFFFF, surface #F3F4F6, ink #202124, muted #5F6368, action #3730A3, danger #B42318.
- System UI font. Body/input 16/24 px, listing title 16/22 px, metadata 14/20 px; control target minimum 48 px; responsive 320/360/390/768/1280 px.
- Navigasi mobile: Beranda, Cari, Pasang, Pesan, Akun. Desktop header navigation; no duplicate visible navigation. Detail contextual CTA replaces bottom tabs.
- Nominal menggunakan integer rupiah, dikirim sebagai string desimal pada JSON. Do not convert money to JS floating point for arithmetic.
- No escrow/cart/online goods payment, fake auth, fake OTP or local consent. No secret/service role key in public clients.
- Search default radius 5 km; selected area and filters persist in navigation. Exact private coordinates never appear in public DTOs.
- Store identity optional; free accounts may sell food/PO personally. Plus is not a trust badge.
- This slice is read-only. Mark preview data visibly synthetic. Unimplemented transactional routes display an honest unavailable message, never success or silent no-op.

## File ownership and boundaries

Create `package.json`, lockfile, TypeScript/Vite/Vitest/Playwright configs, `index.html`, `.env.example`, `.env.preview.example`, `vercel.json`; update README/.gitignore only to describe and exclude generated outputs.

Create `src/app/{App,providers,router}.tsx`, `src/app/styles.css`; `src/components/{AppShell,Dialog,ListingRow,StoreRow,StatusPanel}.tsx`; `src/lib/{money,env,supabase}.ts`; `src/features/discovery/{types,filters,repository,supabase-repository,preview-repository,fixtures}.ts`; `src/features/discovery/{DiscoveryPage,ListingDetailPage,StoreDetailPage,FilterForm,AreaPicker}.tsx`; `src/features/shared/UnavailablePage.tsx`; `src/main.tsx`, `src/vite-env.d.ts`. Small responsibility-based additions are allowed if necessary; document paths in report.

Create colocated `*.test.ts(x)`, `src/test/setup.ts`, `tests/e2e/discovery.spec.ts`. Do not modify the PRD/RFC/PDR baseline or create backend migrations in this task.

## Task 1: Typed read-only marketplace and runnable mobile shell

**Files:** the ownership list above. **Tests:** `src/lib/money.test.ts`, `src/lib/env.test.ts`, discovery repository/filter tests, React discovery/detail tests, `tests/e2e/discovery.spec.ts`.

**Consumes:** PDR UI-01/02 and the public read contract of RFC 10.3. No backend exists yet.

**Produces:**

```ts
type ListingMode = 'sale' | 'barter' | 'free';
type FulfillmentKind = 'ready_stock' | 'preorder' | 'catering';
type DiscoveryQuery = {
  query: string; areaId: string; radiusKm: number;
  category: string | null; mode: ListingMode | null;
  fulfillment: FulfillmentKind | null;
  minPrice: string | null; maxPrice: string | null;
  sort: 'newest' | 'nearest' | 'relevance'; cursor: string | null;
};
interface DiscoveryRepository {
  searchListings(query: DiscoveryQuery, signal?: AbortSignal): Promise<ListingPage>;
  getListing(id: string, signal?: AbortSignal): Promise<PublicListing | null>;
  searchStores(query: DiscoveryQuery, signal?: AbortSignal): Promise<StorePage>;
  getStore(slug: string, signal?: AbortSignal): Promise<PublicStore | null>;
}
```

Define/export `PublicListing`, `PublicStore`, `ListingPage`, `StorePage` in `types.ts` with runtime schemas. Listing contains id/title/description, modes, fulfillment, condition/defects, category, price range decimal strings, variant summaries, approximate area/distance, publisher profile/store, image metadata, PO public terms and availability; no private address, phone or precise coordinates. Pages contain items/nextCursor; no fabricated total count. Store has id/slug/name/description/category/area/hours/fulfillment/reputation and publicAddress only where explicitly disclosed. Document exact payload schema and RPC argument adapter for the backend follow-up.

### Step 1 — Setup and write failing tests

- [ ] Resolve compatible current package versions using npm metadata, pin them, create test/build config without overwriting planning documents. Use Node available on host; use npm.cmd on PowerShell when necessary.
- [ ] Write small failing tests before implementing each behavior. Catch real changes: money precision loss, malformed API data, invalid price/radius/query, filter state loss, wrong mode CTA and fake success. Examples of required expectations:

```ts
expect(formatRupiah('100000')).toBe('Rp100.000');
expect(formatRupiah('9007199254740993')).toBe('Rp9.007.199.254.740.993');
expect(() => formatRupiah('-1')).toThrow();
expect(() => formatRupiah('1.5')).toThrow();
// parse normalizes invalid query values without exposing private coordinates.
expect(parseDiscoveryQuery(new URLSearchParams('radius=NaN')).radiusKm).toBe(5);
expect(parseDiscoveryQuery(new URLSearchParams('min=-5')).minPrice).toBeNull();
```

Use a fixture with distinct sale, barter, free, PO and catering entries, synthetic publisher/store, valid schedule and decimal money. Derive expected results by hand. Repository tests must prove filtering combined query/category/mode/price/radius, deterministic pagination without duplicate IDs, and no unavailable/expired storefront promoted. For the real adapter mock only HTTP transport, check real request/response parsing and surfaced errors.

```tsx
render(<App repository={previewRepository} />);
await user.type(screen.getByRole('searchbox'), 'kursi');
await user.click(screen.getByRole('button', {name: 'Cari'}));
expect(await screen.findByRole('link', {name: /Kursi kayu/})).toBeVisible();
expect(screen.queryByRole('link', {name: /Nasi kotak/})).not.toBeInTheDocument();
```

Exact rendered component wrapper may use router/providers as exported by App. Tests should exercise actual components, not mocked ListingRow.

- [ ] Run `npm test -- --run` (or focused file) and record expected RED before each corresponding implementation. Missing module is not final red evidence: establish stubs returning empty/incorrect result if needed to get an assertion failure, then implement the actual behavior.

### Step 2 — Implement infrastructure and public contract

- [ ] Create strict TypeScript Vite app and React Router routes `/`, `/search`, `/stores`, `/listings/:id`, `/stores/:slug`. Put remaining planned routes behind honest UnavailablePage; keep `/listings/new` separate from dynamic detail and do not invent login success. Include a useful 404.
- [ ] `App` receives a repository for integration tests. Default runtime uses a Supabase client only with valid public configuration. `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` are required; reject accidental secret/service credentials and non-http(s) URL. Missing config shows actionable setup text and link to README instructions, not a blank page. Never print provided keys.
- [ ] Explicit preview mode (`vite --mode preview`) lazy-loads synthetic fixtures and always labels them “Data contoh — belum terhubung ke transaksi nyata”. Production default must not silently fallback on API errors. Expose `npm run dev:preview` and `build:preview` for UI verification.
- [ ] Adapter calls `search_listings`, `get_listing`, `search_stores`, `get_store` RPC; use one `p_query` JSON input for search and `p_id`/`p_slug` for detail; document provisional transport contract. No `.from(...).select('*')` exposing unknown fields. Validate returned DTO before render, strip unexpected keys, preserve null not-found vs network failure. Pass AbortSignal.
- [ ] Cache keys contain the complete query and source mode. URL search params hold non-sensitive filters, store/detail return context; cancel stale requests on query change. React Query handles loading/error/refetch, no optimistic business state. Do not use exact device coordinates in URLs or fixture DTOs.

### Step 3 — Implement UI and interactions

- [ ] Implement the exact PDR palette, typography, compact header/search, category directory, Barang/Toko sekitar tabs, filter sheet and result list. No hero. Desktop sidebar uses same category/filter data; mobile bottom nav and safe area padding do not obscure content.
- [ ] Fixtures are illustrative only, deterministic, no data tied to current wall clock unexpectedly disappearing. Images may be local simple illustrative assets clearly marked or stable externally licensed demo photos with attribution; no network-generated pretend actual product photos. Missing/failed image fallback accessible. No copied brand assets.
- [ ] Query submit, categories, mode, fulfillment, area and radius, min/max price and sorting actually filter the preview fixtures. Check inverted ranges with inline error. Radius options draft 5/10/20/50 from one config source, with area manual selection. Implement area examples as approximate synthetic distances, explicitly not production PostGIS. Do not request geolocation automatically.
- [ ] “Tampilkan lagi” appends the next page, no duplicate results. Empty/error/loading states preserve filters and provide real reset/retry. Reset preserves selected area. Query/tab/filter/scroll survive detail→back. Native dialog supports Escape, focus return and visible close; form input survives canceled fetch.
- [ ] Listing detail shows full name/photos/condition/defects, mode-specific CTA, PO minimum/close/availability/DP, variants, approximate location and personal/store identity. Dual mode offers both paths. Reserved/unavailable disables new deal with reason. CTA routes to honest integration-pending page preserving listing ID; it must not fabricate a chat or consent. Store detail shows separate identity, optional disclosed address and filtered catalogue; no shared rating across stores.
- [ ] Currency formatter uses BigInt and explicit rupiah formatting. Dates use WIB. No rendered contact details outside opt-in public store address. “Nomor terverifikasi” is not identity guarantee, and empty rating is “Belum ada ulasan”.

### Step 4 — Verify, document and hand off

- [ ] Run focused tests to GREEN, full unit suite once, `npm run typecheck`, `npm run build`, and dependency audit. Fix task regressions; report upstream warnings with actual impact.
- [ ] Playwright tests start explicit preview server and verify search/filter/back, detail/store navigation, empty+retry/error behavior, 320/390/1280 viewport overflow, bottom nav visibility and keyboard dialog interactions. Capture screenshot artifacts at 390 and 1280. Review actual screenshots using image viewer; do not assert visual quality from DOM alone. If browser infrastructure is unavailable, report exact limitation and leave visual verification incomplete.
- [ ] README: commands, env names without secrets, provisional RPC contract link, preview limitations and integration status. Keep original planning links. Add `docs/contracts/discovery-api.md` for the precise validated DTO/RPC transport and test examples so backend task can implement it.
- [ ] Run `git diff --check`, stage only this task's files and commit `feat: add mobile marketplace discovery foundation`. Do not push, merge, deploy, write cloud DB, or modify baseline specs.
- [ ] Write report in controller-provided path: changed files, RED/GREEN commands+results, build/E2E evidence, screenshots, concerns and remaining integration work. This task's completion does not mean Supabase/backend/transactions or overall goal is complete.

## Preflight review

Single task owns setup, public DTO, adapter and its consumers, so interface names are shared in one task rather than conflicting parallel files. Supabase RPC contract is explicitly provisional and has no backend implementation yet; follow-up must implement and verify it before discovery becomes an integrated completed flow. Preview is isolated by mode and cannot count toward persistence/auth/RLS evidence. PDR design decisions are reused, not reinvented.

## Execution outcome

Implemented on `feat/barter-webapp` by the controller after the dispatched agent reached an external usage limit. All task outputs are present; `getStoreListings` was added to the repository contract because a real store catalogue cannot safely filter a global result client-side. Verification evidence and explicit backend boundaries are recorded in `docs/IMPLEMENTATION.md` and the ignored SDD task report. This outcome does not close stages 2–10 or the overall web-app goal.
