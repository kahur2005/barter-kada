# App-wide Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved dark, image-led Barter visual system to every registered route without changing business rules or backend contracts.

**Architecture:** Keep queries, mutations, validation, permissions, and routing inside their current feature pages. Move the approved colors and type rules into the global shell, add a small set of semantic presentation primitives, then give each route family one focused stylesheet loaded by its entry page. Existing feature tests protect product behavior; new component and browser checks cover the shared layout contracts.

**Tech Stack:** React 19, TypeScript 7, React Router 7, TanStack Query 5, Vite 8, Vitest 5, Testing Library, Playwright 1.63, CSS.

**Spec:** `docs/superpowers/specs/2026-09-18-app-wide-mobile-redesign-design.md`

## Global Constraints

- Use `DESIGN.md` and `.impeccable/mocks/app-wide-discovery.png` as the primary visual reference.
- Keep Night `#111318`, Raised night `#1A1D23`, White `#FFFFFF`, Quiet text `#B7BAC4`, Rule `#353942`, Electric lime `#D6FF4B`, Coral `#FF7A59`, and Error `#FF957D`.
- Lime marks one primary action or the current state; coral marks prices and money-related consequences.
- Preserve every route, gateway call, validation rule, mutation, permission, preview notice, private-location statement, and simulated-billing warning.
- Reflow at 320 CSS pixels, support 200% text zoom, retain visible focus, honor safe-area insets, and disable nonessential movement under `prefers-reduced-motion`.
- Do not add dependencies, remote fonts, fabricated inventory, ratings, testimonials, transaction claims, or generated images to runtime data.
- Generated comps guide composition only. All shipped controls and text stay semantic HTML.

## File Map

- `src/app/styles.css`: base reset, design tokens, controls, notices, dialogs, and legacy rules that still serve several routes.
- `src/app/app-shell.css`: site header, page container, bottom navigation, focused-task shell, safe areas, and desktop navigation.
- `src/components/SurfacePrimitives.tsx`: reusable heading, fact list, stage rail, and action dock markup.
- `src/components/SurfacePrimitives.test.tsx`: accessible contracts for those primitives.
- `src/features/discovery/discovery.css`: discovery, listing cards, listing detail, store detail, filters, and gallery.
- `src/features/auth/account-surfaces.css`: registration, onboarding, profile, owned listings, Plus, and owned stores.
- `src/features/chat/chat-surfaces.css`: inbox, room header, messages, privacy note, media preview, and composer.
- `src/features/transactions/transaction-surfaces.css`: transaction hub, barter, order, amendment, refund, and sticky workflow actions.
- `src/features/shared/support-surfaces.css`: notifications, reviews, reports, admin tools, setup, unavailable, loading, empty, and error views.
- `tests/e2e/app-wide-visual.spec.ts`: dark-shell, viewport-overflow, focus, and sticky-action checks at the three configured viewports.

---

### Task 1: Make the approved visual system global

**Files:**
- Modify: `src/app/App.test.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/app/styles.css`
- Create: `src/app/app-shell.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: global CSS custom properties and shell classes used by every later task.
- Produces: primary navigation labels `Jelajah`, `Cari`, `Pasang`, `Chat`, and `Akun`.
- Preserves: focused routes omit competing navigation and customer-support chrome.

- [ ] **Step 1: Replace the focused-only shell test with the app-wide contract**

In `src/app/App.test.tsx`, replace `removes competing chrome only from focused auth journeys` with:

```tsx
it('keeps the Barter shell consistent while focused tasks remove competing navigation', () => {
  const focused = show('/auth/login');
  expect(screen.getByRole('link', { name: 'Barter beranda' })).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Buka bantuan pelanggan' })).not.toBeInTheDocument();
  focused.unmount();

  show('/search');
  expect(screen.getAllByRole('link', { name: 'Jelajah' })).not.toHaveLength(0);
  expect(screen.getAllByRole('link', { name: 'Chat' })).not.toHaveLength(0);
  expect(screen.getByRole('link', { name: /Notifikasi/ })).toBeVisible();
  expect(screen.getAllByRole('navigation', { name: 'Navigasi utama' })).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Buka bantuan pelanggan' })).toBeVisible();
});
```

- [ ] **Step 2: Run the shell test and confirm the old labels fail**

Run: `npm.cmd test -- src/app/App.test.tsx`

Expected: FAIL because the current links are named `Beranda` and `Pesan`.

- [ ] **Step 3: Update the shell structure and navigation labels**

In `src/components/AppShell.tsx`, change the navigation array and keep focused-route behavior explicit:

```tsx
const navigation = [
  { path: '/', text: 'Jelajah', icon: 'home' },
  { path: '/search', text: 'Cari', icon: 'search' },
  { path: '/listings/new', text: 'Pasang', icon: 'plus' },
  { path: '/chat', text: 'Chat', icon: 'chat' },
  { path: '/profile', text: 'Akun', icon: 'user' },
] as const;

const focusedTask =
  pathname.startsWith('/auth/') ||
  pathname === '/onboarding' ||
  pathname === '/listings/new' ||
  /^\/my\/listings\/[^/]+\/edit$/.test(pathname) ||
  (pathname.startsWith('/chat/') && pathname !== '/chat');
```

Use `focusedTask` only to decide which chrome is present. Remove `focused-header` and `focused-journey`; render `className="site-header"` and give the main element one stable base plus layout state:

```tsx
<main
  id="main"
  className={`page-shell ${focusedTask ? 'task-shell' : showBottomNav ? 'with-navigation' : isImmersive ? 'with-actions' : ''}`}
>
  {children}
</main>
```

- [ ] **Step 4: Replace the purple root tokens and extract shell CSS**

Set the opening tokens in `src/app/styles.css` to:

```css
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #ffffff;
  background: #111318;
  color-scheme: dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --paper: #111318;
  --surface: #1a1d23;
  --surface-strong: #24272e;
  --ink: #ffffff;
  --muted: #b7bac4;
  --action: #d6ff4b;
  --action-hover: #e3ff7e;
  --action-light: rgb(214 255 75 / 12%);
  --action-border: rgb(214 255 75 / 46%);
  --price: #ff7a59;
  --danger: #ff957d;
  --danger-bg: #2a1919;
  --success: #d6ff4b;
  --success-bg: #1d2516;
  --warning: #ffc86a;
  --warning-bg: #2b2417;
  --rule: #353942;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
}
```

Create `src/app/app-shell.css` with the shell rules, including the circular center listing action:

```css
body { min-width: 320px; min-height: 100dvh; background: var(--paper); }
.site-header { position: sticky; top: 0; z-index: 30; border-bottom: 1px solid var(--rule); background: rgb(17 19 24 / 94%); backdrop-filter: blur(12px); }
.header-inner { max-width: 1280px; margin: auto; padding: 4px 18px; display: flex; align-items: center; gap: 16px; }
.wordmark { color: var(--ink); font-size: 2rem; font-weight: 850; letter-spacing: -.065em; text-decoration: none; }
.wordmark span { color: var(--action); }
.page-shell { width: 100%; max-width: 1280px; min-height: calc(100dvh - 57px); margin: auto; padding: 24px 18px 40px; }
.task-shell { max-width: none; padding: 0; }
.with-navigation { padding-bottom: calc(92px + env(safe-area-inset-bottom)); }
.with-actions { padding-bottom: calc(136px + env(safe-area-inset-bottom)); }
.bottom-nav { position: fixed; inset: auto 0 0; z-index: 30; display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--rule); background: rgb(17 19 24 / 97%); padding-bottom: env(safe-area-inset-bottom); }
.bottom-nav a { min-width: 0; min-height: 64px; display: grid; place-items: center; align-content: center; gap: 2px; color: var(--muted); text-decoration: none; font-size: .75rem; }
.bottom-nav a.active { color: var(--action); font-weight: 750; }
.bottom-nav a:nth-child(3) svg { width: 52px; height: 52px; margin-top: -26px; padding: 13px; color: #111318; background: var(--action); border-radius: 50%; }
@media (min-width: 48rem) {
  .page-shell { padding: 36px clamp(24px, 4vw, 56px) 56px; }
  .bottom-nav { display: none; }
  .desktop-nav { display: flex; margin-left: auto; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
```

Import `./app/app-shell.css` immediately after `./app/styles.css` in `src/main.tsx`. Keep `focused-journey.css`, `auth-journey.css`, and `listing-editor.css` after it until Task 8 removes obsolete token overrides.

- [ ] **Step 5: Run the shell tests and typecheck**

Run: `npm.cmd test -- src/app/App.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the shell**

```bash
git add src/app/App.test.tsx src/components/AppShell.tsx src/app/styles.css src/app/app-shell.css src/main.tsx
git commit -m "feat: apply Barter theme to the app shell"
```

---

### Task 2: Add semantic surface primitives

**Files:**
- Create: `src/components/SurfacePrimitives.tsx`
- Create: `src/components/SurfacePrimitives.test.tsx`
- Modify: `src/components/Icon.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**
- Produces: `PageHeading`, `FactList`, `FactRow`, `StageRail`, and `ActionDock`.
- Consumes: `IconName` and `Icon` from `src/components/Icon.tsx`.
- `StageRail` receives `stages: ReadonlyArray<{ id: string; label: string }>` and `current: string`.

- [ ] **Step 1: Write tests for accessible headings, facts, progress, and actions**

Create `src/components/SurfacePrimitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionDock, FactList, FactRow, PageHeading, StageRail } from './SurfacePrimitives';

describe('surface primitives', () => {
  it('keeps page context and supporting copy associated with the heading', () => {
    render(<PageHeading kicker="Barang sekitar" title="Temukan barang baik" description="Lokasi tetap privat." />);
    expect(screen.getByRole('heading', { name: 'Temukan barang baik' })).toBeVisible();
    expect(screen.getByText('Lokasi tetap privat.')).toBeVisible();
  });

  it('renders facts as one definition list', () => {
    render(<FactList label="Detail barang"><FactRow label="Kondisi" value="Baik" /><FactRow label="Lokasi" value="Beji, Depok" /></FactList>);
    expect(screen.getByRole('group', { name: 'Detail barang' })).toHaveTextContent('KondisiBaik');
  });

  it('marks only the active journey stage as current', () => {
    render(<StageRail label="Tahap transaksi" stages={[{ id: 'chat', label: 'Chat' }, { id: 'agree', label: 'Sepakat' }, { id: 'done', label: 'Selesai' }]} current="agree" />);
    expect(screen.getByText('Sepakat').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Chat').closest('li')).not.toHaveAttribute('aria-current');
  });

  it('names the sticky action group', () => {
    render(<ActionDock label="Aksi penawaran" primary={<button>Chat Dita</button>} secondary={<button>Ajukan barter</button>} />);
    expect(screen.getByRole('group', { name: 'Aksi penawaran' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run: `npm.cmd test -- src/components/SurfacePrimitives.test.tsx`

Expected: FAIL because `SurfacePrimitives.tsx` does not exist.

- [ ] **Step 3: Implement the primitives**

Add these paths to the `paths` object in `src/components/Icon.tsx`:

```tsx
tag: 'M20 13 13 20 4 11V4h7l9 9ZM8.5 8.5h.01',
lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
```

Create `src/components/SurfacePrimitives.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function PageHeading({ kicker, title, description, leading, actions }: { kicker?: ReactNode; title: ReactNode; description?: ReactNode; leading?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading">
    {leading}
    {kicker && <p className="page-kicker">{kicker}</p>}
    <div className="page-heading-row"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions}</div>
  </header>;
}

export function FactList({ label, children }: { label: string; children: ReactNode }) {
  return <dl className="fact-list" role="group" aria-label={label}>{children}</dl>;
}

export function FactRow({ icon, label, value }: { icon?: IconName; label: string; value: ReactNode }) {
  return <div className="fact-row">{icon && <span className="fact-icon" aria-hidden="true"><Icon name={icon} /></span>}<dt>{label}</dt><dd>{value}</dd></div>;
}

export function StageRail({ label, stages, current }: { label: string; stages: ReadonlyArray<{ id: string; label: string }>; current: string }) {
  const currentIndex = Math.max(0, stages.findIndex(stage => stage.id === current));
  return <ol className="stage-rail" aria-label={label}>{stages.map((stage, index) => <li key={stage.id} aria-current={stage.id === current ? 'step' : undefined} data-state={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending'}><span>{index + 1}</span><b>{stage.label}</b></li>)}</ol>;
}

export function ActionDock({ label, primary, secondary, note }: { label: string; primary: ReactNode; secondary?: ReactNode; note?: ReactNode }) {
  return <aside className="action-dock" role="group" aria-label={label}>{note && <p>{note}</p>}<div>{secondary}{primary}</div></aside>;
}
```

- [ ] **Step 4: Add the shared CSS contract**

Append to `src/app/styles.css`:

```css
.page-heading { display: grid; gap: 10px; margin-bottom: 28px; }
.page-kicker { color: var(--action); font-size: .82rem; font-weight: 750; }
.page-heading-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.page-heading h1 { max-width: 14ch; font-size: clamp(2.25rem, 9vw, 4.5rem); line-height: 1; letter-spacing: -.055em; font-weight: 850; }
.page-heading-row p { max-width: 62ch; margin-top: 10px; color: var(--muted); }
.fact-list { display: grid; margin: 0; }
.fact-row { display: grid; grid-template-columns: 48px minmax(0, 1fr); column-gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--rule); }
.fact-icon { grid-row: 1 / span 2; width: 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; background: var(--surface); }
.fact-row dt { color: var(--muted); font-size: .88rem; }
.fact-row dd { margin: 0; font-size: 1.05rem; font-weight: 700; }
.stage-rail { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
.stage-rail li { position: relative; display: grid; justify-items: center; gap: 6px; color: var(--muted); text-align: center; }
.stage-rail li::after { content: ''; position: absolute; top: 21px; left: 50%; width: 100%; border-top: 1px solid var(--rule); z-index: -1; }
.stage-rail li:last-child::after { display: none; }
.stage-rail span { width: 44px; height: 44px; display: grid; place-items: center; border: 2px solid currentColor; border-radius: 50%; background: var(--paper); font-weight: 800; }
.stage-rail [data-state='complete'], .stage-rail [data-state='current'] { color: var(--action); }
.stage-rail [data-state='current'] span { color: #111318; background: var(--action); border-color: var(--action); }
.stage-rail b { font-size: .82rem; }
.action-dock { position: fixed; inset: auto 0 0; z-index: 25; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--rule); background: rgb(17 19 24 / 97%); }
.action-dock > p, .action-dock > div { width: min(100%, 1160px); margin-inline: auto; }
.action-dock > p { margin-bottom: 8px; color: var(--muted); font-size: .82rem; }
.action-dock > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.action-dock > div > :only-child { grid-column: 1 / -1; }
```

- [ ] **Step 5: Run the component tests**

Run: `npm.cmd test -- src/components/SurfacePrimitives.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the primitives**

```bash
git add src/components/SurfacePrimitives.tsx src/components/SurfacePrimitives.test.tsx src/components/Icon.tsx src/app/styles.css
git commit -m "feat: add shared mobile surface primitives"
```

---

### Task 3: Redesign discovery and public detail routes

**Files:**
- Modify: `src/app/App.test.tsx`
- Modify: `src/features/discovery/DiscoveryPage.tsx`
- Modify: `src/components/ListingRow.tsx`
- Modify: `src/components/StoreRow.tsx`
- Modify: `src/features/discovery/ListingDetailPage.tsx`
- Modify: `src/features/discovery/StoreDetailPage.tsx`
- Create: `src/features/discovery/discovery.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `PageHeading`, `FactList`, `FactRow`, and `ActionDock` from Task 2.
- Changes: `ListingRow` accepts `featured?: boolean`; the default stays `false`.
- Preserves: query serialization, filters, pagination, return state, gallery, report links, and transaction actions.

- [ ] **Step 1: Add a failing test for the featured discovery result and privacy fact**

Add to `src/app/App.test.tsx`:

```tsx
it('gives the first unfiltered offer visual priority and keeps exact location private', async () => {
  const home = show('/');
  const featured = await screen.findByRole('article', { name: 'Penawaran utama: Kursi kayu bekas' });
  expect(featured).toContainElement(screen.getByRole('link', { name: 'Kursi kayu bekas' }));
  home.unmount();

  show(`/listings/${listing.id}`);
  expect(await screen.findByRole('group', { name: 'Detail penawaran' })).toHaveTextContent('Lokasi tepatTetap privat');
});
```

- [ ] **Step 2: Run the test and confirm the missing article label fails**

Run: `npm.cmd test -- src/app/App.test.tsx`

Expected: FAIL because `ListingRow` has no featured state or named detail fact list.

- [ ] **Step 3: Mark only the first unfiltered listing as featured**

Change the `ListingRow` signature and article in `src/components/ListingRow.tsx`:

```tsx
export function ListingRow({ listing, eager = false, featured = false }: { listing: PublicListing; eager?: boolean; featured?: boolean }) {
  // existing data derivation remains
  return <article className={`listing-row${featured ? ' listing-row--featured' : ''}`} aria-label={featured ? `Penawaran utama: ${listing.title}` : undefined}>
    {/* existing media and content */}
  </article>;
}
```

Wrap `DiscoveryPage` in `<section className="discovery-page">`. Replace its heading with:

```tsx
<PageHeading
  title={isStores ? 'Toko baik di sekitarmu.' : 'Temukan barang baik di sekitarmu.'}
  description={<button className="area-button" onClick={() => setDialog('area')}><Icon name="pin" />{area} · hingga {query.radiusKm} km<Icon name="chevron" /></button>}
/>
```

Pass `featured={location.pathname === '/' && !query.query && !query.category && index === 0}` to listing rows. Store rows never receive featured treatment.

- [ ] **Step 4: Convert listing detail facts and actions to shared primitives**

Keep all condition, preorder, catering, variant, identity, safety, gallery, and reporting branches. Replace the inline detail toolbar with `BackLink` plus the existing share button; then add this fact block after the title and price:

```tsx
<FactList label="Detail penawaran">
  <FactRow icon="tag" label="Kondisi" value={(listing.condition && conditionLabels[listing.condition]) || 'Tidak dijelaskan'} />
  <FactRow icon="pin" label="Lokasi tepat" value="Tetap privat" />
  <FactRow icon="package" label="Penyerahan" value={listing.handoverMethods.map(method => handoverLabels[method]).join(', ')} />
</FactList>
```

Replace `.context-actions` with:

```tsx
<ActionDock
  label="Aksi penawaran"
  note="Periksa kondisi barang sebelum menerima."
  secondary={barter && available ? <Link className="button secondary" to={`/barter/new/${listing.id}`} state={{ from: location.pathname }}>Ajukan barter</Link> : undefined}
  primary={available && (sale || free) ? <Link className="button" to={`/chat/open/${listing.id}`} state={{ from: location.pathname }}>{chatLabel}</Link> : <button className="button" disabled>Tidak tersedia</button>}
/>
```

Give `StoreDetailPage` the `store-page` composition, but keep its rating, address-consent branch, hours, handover methods, catalogue query, pagination, and empty states unchanged.

- [ ] **Step 5: Add the discovery stylesheet**

Create `src/features/discovery/discovery.css`. Use the following structural rules and carry existing filter/dialog rules into this file rather than duplicating them:

```css
.discovery-page { display: grid; gap: 18px; }
.search-form { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 8px 8px 8px 16px; border: 1px solid var(--rule); border-radius: 16px; background: var(--surface); }
.search-form input { border: 0; background: transparent; box-shadow: none; }
.quick-chips-row, .category-directory { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; }
.chip-btn, .category-directory button { min-width: max-content; color: var(--ink); background: var(--surface); border: 1px solid var(--rule); border-radius: 999px; }
.chip-btn.active, .category-directory button.selected { color: #111318; background: var(--action); border-color: var(--action); }
.result-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.listing-row { min-width: 0; overflow: hidden; border: 1px solid var(--rule); border-radius: var(--radius-md); background: var(--paper); }
.listing-row--featured { grid-column: 1 / -1; }
.listing-row--featured .listing-image-wrap { aspect-ratio: 4 / 5; }
.listing-image-wrap { aspect-ratio: 1; overflow: hidden; background: var(--surface); }
.listing-image-wrap .product-image { width: 100%; height: 100%; object-fit: cover; }
.listing-content { padding: 12px 2px 18px; }
.listing-price, .detail-price { color: var(--price); font-weight: 850; font-variant-numeric: tabular-nums; }
.detail-page { margin: -24px -18px 0; padding-bottom: 118px; }
.detail-media .detail-image { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.detail-body, .detail-page > .back-link { margin-inline: 18px; }
.detail-summary h1 { max-width: 15ch; font-size: clamp(2.4rem, 11vw, 4.6rem); line-height: 1; letter-spacing: -.055em; }
.detail-section, .identity-panel { padding-block: 22px; border-top: 1px solid var(--rule); }
@media (min-width: 48rem) {
  .result-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .listing-row--featured { grid-column: span 2; grid-row: span 2; }
  .detail-page { margin: 0; }
  .detail-layout { grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr); gap: 40px; }
  .detail-media { position: sticky; top: 84px; }
}
```

Import `./features/discovery/discovery.css` in `src/main.tsx` after the shell stylesheet.

- [ ] **Step 6: Run discovery tests and typecheck**

Run: `npm.cmd test -- src/app/App.test.tsx src/features/discovery/filters.test.ts src/features/discovery/preview-repository.test.ts`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit public discovery surfaces**

```bash
git add src/app/App.test.tsx src/features/discovery/DiscoveryPage.tsx src/components/ListingRow.tsx src/components/StoreRow.tsx src/features/discovery/ListingDetailPage.tsx src/features/discovery/StoreDetailPage.tsx src/features/discovery/discovery.css src/main.tsx
git commit -m "feat: redesign discovery and public listing surfaces"
```

---

### Task 4: Bring authentication, account, and owner tools into the same world

**Files:**
- Modify: `src/features/auth/AuthFlow.test.tsx`
- Modify: `src/features/auth/AccountPage.test.tsx`
- Modify: `src/features/listings/MyListingsPage.test.tsx`
- Modify: `src/features/auth/RegisterPage.tsx`
- Modify: `src/features/onboarding/OnboardingPage.tsx`
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/listings/MyListingsPage.tsx`
- Modify: `src/features/stores/PlusPage.tsx`
- Modify: `src/features/stores/MyStoresPage.tsx`
- Create: `src/features/auth/account-surfaces.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `PageHeading` and existing `BackButton`/`BackLink`.
- Preserves: sign-up outcomes, onboarding consent, avatar operations, listing quotas, reservations, Plus simulation warnings, and store form validation.

- [ ] **Step 1: Add failing semantic tests for account and owned-list navigation**

In `src/features/auth/AccountPage.test.tsx`, add an assertion to the existing account-navigation test:

```tsx
expect(screen.getByRole('navigation', { name: 'Kelola akun' })).toBeVisible();
```

In `src/features/listings/MyListingsPage.test.tsx`, add after data loads:

```tsx
expect(screen.getByRole('list', { name: 'Listing milikmu' })).toBeVisible();
```

- [ ] **Step 2: Run the focused tests and confirm the landmarks are missing**

Run: `npm.cmd test -- src/features/auth/AccountPage.test.tsx src/features/listings/MyListingsPage.test.tsx`

Expected: FAIL because the account menu has no navigation label and the owner list is a plain `div`.

- [ ] **Step 3: Apply the shared page hierarchy without changing handlers**

In `AccountPage.tsx`, keep profile and avatar code untouched. Give its settings navigation `aria-label="Kelola akun"` and use `PageHeading` for the visible page title.

In `MyListingsPage.tsx`, change the owner container to:

```tsx
<div className="owner-list" role="list" aria-label="Listing milikmu">
  {data?.items.map(item => <article key={item.listingId} role="listitem">{/* existing row and actions */}</article>)}
</div>
```

Add `auth-card--focused` to `RegisterPage`, add a stable `onboarding-page` class to `OnboardingPage`, and wrap the first title block in each account/owner/store route with `PageHeading`. Do not rename form labels or action copy.

- [ ] **Step 4: Add account and owner CSS**

Create `src/features/auth/account-surfaces.css`:

```css
.auth-card, .onboarding-page, .account-page, .my-listings, .plus-page, .stores-page { width: min(100%, 760px); margin-inline: auto; }
.auth-card, .onboarding-page { min-height: calc(100dvh - 57px); padding: 28px 18px calc(32px + env(safe-area-inset-bottom)); }
.auth-card h1, .onboarding-page h1 { max-width: 12ch; font-size: clamp(2.4rem, 11vw, 4.8rem); line-height: 1; letter-spacing: -.055em; }
.stack-form { display: grid; gap: 14px; }
.stack-form label { display: grid; gap: 7px; font-weight: 700; }
.account-profile-card, .quota-counter, .plus-panel, .plus-expired-banner { padding: 18px; border: 1px solid var(--rule); border-radius: var(--radius-md); background: var(--surface); }
.settings-menu { display: grid; border-top: 1px solid var(--rule); }
.settings-menu-item { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--ink); border-bottom: 1px solid var(--rule); text-decoration: none; }
.owner-tabs { display: flex; overflow-x: auto; border-bottom: 1px solid var(--rule); }
.owner-tabs button[aria-selected='true'] { color: var(--action); border-bottom-color: var(--action); }
.owner-list article { display: grid; gap: 16px; padding: 18px 0; border-bottom: 1px solid var(--rule); }
.owner-list-media { width: 96px; height: 96px; object-fit: cover; border-radius: 12px; }
.owner-actions { display: flex; flex-wrap: wrap; gap: 8px; }
@media (min-width: 48rem) {
  .auth-card, .onboarding-page { padding-top: 64px; }
  .owner-list article { grid-template-columns: minmax(0, 1fr) auto; }
}
```

Import it in `src/main.tsx` after `auth-journey.css` so focused login and listing-specific rules remain intentional.

- [ ] **Step 5: Run the account and ownership suites**

Run: `npm.cmd test -- src/features/auth/AuthFlow.test.tsx src/features/auth/AccountPage.test.tsx src/features/onboarding/OnboardingPage.test.tsx src/features/listings/MyListingsPage.test.tsx src/features/stores/PlusPage.test.tsx src/features/stores/MyStoresPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit account and owner surfaces**

```bash
git add src/features/auth src/features/onboarding/OnboardingPage.tsx src/features/listings/MyListingsPage.tsx src/features/listings/MyListingsPage.test.tsx src/features/stores/PlusPage.tsx src/features/stores/MyStoresPage.tsx src/main.tsx
git commit -m "feat: redesign account and owner surfaces"
```

---

### Task 5: Redesign inbox, chat, and the transaction hub

**Files:**
- Modify: `src/features/chat/ChatPages.test.tsx`
- Modify: `src/features/transactions/TransactionsPage.test.tsx`
- Modify: `src/features/chat/ChatPages.tsx`
- Modify: `src/features/transactions/TransactionsPage.tsx`
- Create: `src/features/chat/chat-surfaces.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `PageHeading` and `Icon`.
- Produces: a named privacy note inside the chat room.
- Preserves: message paging, read cursors, blocking, image validation and upload, text retention on failure, transaction filters, and transaction links.

- [ ] **Step 1: Add a failing privacy-note assertion**

In the existing chat-room send test in `src/features/chat/ChatPages.test.tsx`, add:

```tsx
expect(await screen.findByRole('note', { name: 'Privasi lokasi' })).toHaveTextContent('Lokasi tepat tetap privat');
```

- [ ] **Step 2: Run the chat test and confirm the note is absent**

Run: `npm.cmd test -- src/features/chat/ChatPages.test.tsx`

Expected: FAIL because the room has no explicit privacy note.

- [ ] **Step 3: Add the truthful privacy row and page headings**

In `ChatRoomPage`, place this after the listing context header and before messages:

```tsx
<aside className="chat-privacy-note" role="note" aria-label="Privasi lokasi">
  <span aria-hidden="true"><Icon name="lock" /></span>
  <p><strong>Lokasi tepat tetap privat.</strong> Bagikan alamat hanya setelah detail penyerahan disepakati.</p>
</aside>
```

Use `PageHeading` for `ChatInboxPage` and `TransactionsPage`, but keep their existing back actions, descriptions, filters, groups, and empty states. Do not add transaction progress to chat because a conversation can exist before a barter or order begins.

- [ ] **Step 4: Add chat and hub CSS**

Create `src/features/chat/chat-surfaces.css`:

```css
.chat-inbox, .chat-room, .transactions-page { width: min(100%, 760px); margin-inline: auto; }
.conversation-list, .transaction-list { border-top: 1px solid var(--rule); }
.conversation-list > a, .transaction-list article { min-height: 84px; padding: 16px 0; border-bottom: 1px solid var(--rule); color: var(--ink); text-decoration: none; }
.chat-header { position: sticky; top: 57px; z-index: 12; padding: 10px 0 14px; background: var(--paper); border-bottom: 1px solid var(--rule); }
.chat-privacy-note { display: grid; grid-template-columns: 48px minmax(0, 1fr); align-items: center; gap: 14px; margin-top: 18px; padding: 14px 0; border-block: 1px solid var(--rule); color: var(--muted); }
.chat-privacy-note > span { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; background: var(--surface); color: var(--ink); }
.message-list { min-height: 45vh; display: flex; flex-direction: column; gap: 12px; padding: 20px 0 190px; }
.message { max-width: 82%; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 18px 18px 18px 4px; background: var(--surface); }
.message.own { align-self: flex-end; color: #111318; background: var(--action); border-color: var(--action); border-radius: 18px 18px 4px 18px; }
.message.own footer { color: rgb(17 19 24 / 68%); }
.chat-composer, .blocked-notice { position: fixed; inset: auto 0 0; z-index: 25; padding: 10px max(18px, calc((100vw - 760px) / 2)) calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--rule); background: rgb(17 19 24 / 98%); }
.chat-composer { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.chat-composer textarea { min-height: 52px; max-height: 132px; resize: vertical; border-radius: 18px; }
```

Import it in `src/main.tsx`.

- [ ] **Step 5: Run chat and transaction-hub tests**

Run: `npm.cmd test -- src/features/chat/ChatPages.test.tsx src/features/transactions/TransactionsPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit messaging and transaction hub**

```bash
git add src/features/chat/ChatPages.tsx src/features/chat/ChatPages.test.tsx src/features/chat/chat-surfaces.css src/features/transactions/TransactionsPage.tsx src/features/transactions/TransactionsPage.test.tsx src/main.tsx
git commit -m "feat: redesign chat and transaction hub"
```

---

### Task 6: Add truthful progress and action hierarchy to barter and order rooms

**Files:**
- Modify: `src/features/trades/TradeRoomPage.test.tsx`
- Modify: `src/features/orders/OrderRoomPage.test.tsx`
- Modify: `src/features/trades/TradeRoomPage.tsx`
- Modify: `src/features/orders/OrderRoomPage.tsx`
- Modify: `src/features/trades/NewTradePage.tsx`
- Modify: `src/features/trades/TradeEditPage.tsx`
- Modify: `src/features/orders/OrderQuotePage.tsx`
- Modify: `src/features/orders/OrderAmendmentPage.tsx`
- Modify: `src/features/orders/RefundPage.tsx`
- Create: `src/features/transactions/transaction-surfaces.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `StageRail`, `PageHeading`, and `ActionDock`.
- Trade stages: `offer`, `agreement`, `handover`.
- Order stages: `summary`, `processing`, `handover`, `complete`.
- Cancelled records show their existing cancellation notice and no misleading active stage.

- [ ] **Step 1: Add failing progress assertions**

In the negotiating-room test in `TradeRoomPage.test.tsx`, add:

```tsx
expect(screen.getByRole('list', { name: 'Tahap barter' })).toBeVisible();
expect(screen.getByText('Penawaran').closest('li')).toHaveAttribute('aria-current', 'step');
```

In the processing-room test in `OrderRoomPage.test.tsx`, add:

```tsx
expect(screen.getByRole('list', { name: 'Tahap pesanan' })).toBeVisible();
expect(screen.getByText('Diproses').closest('li')).toHaveAttribute('aria-current', 'step');
```

- [ ] **Step 2: Run the room tests and confirm both rails are absent**

Run: `npm.cmd test -- src/features/trades/TradeRoomPage.test.tsx src/features/orders/OrderRoomPage.test.tsx`

Expected: FAIL on the missing named lists.

- [ ] **Step 3: Map server lifecycles to display stages**

Add near the top of `TradeRoomPage.tsx`:

```tsx
const tradeStages = [
  { id: 'offer', label: 'Penawaran' },
  { id: 'agreement', label: 'Sepakat' },
  { id: 'handover', label: 'Serah terima' },
] as const;

function tradeStage(lifecycle: 'negotiating' | 'agreed' | 'completed' | 'cancelled') {
  if (lifecycle === 'completed') return 'handover';
  if (lifecycle === 'agreed') return 'agreement';
  return 'offer';
}
```

Render `<StageRail label="Tahap barter" stages={tradeStages} current={tradeStage(room.lifecycle)} />` only when lifecycle is not `cancelled`.

Add to `OrderRoomPage.tsx`:

```tsx
const orderStages = [
  { id: 'summary', label: 'Ringkasan' },
  { id: 'processing', label: 'Diproses' },
  { id: 'handover', label: 'Serah terima' },
  { id: 'complete', label: 'Selesai' },
] as const;

function orderStage(lifecycle: OrderRoom['lifecycle']) {
  if (lifecycle === 'completed') return 'complete';
  if (lifecycle === 'ready' || lifecycle === 'awaiting_receipt') return 'handover';
  if (lifecycle === 'processing') return 'processing';
  return 'summary';
}
```

`OrderRoomPage.tsx` already imports `OrderRoom` from `./types`; reuse that type and do not create a second lifecycle union. Render the rail only for non-cancelled orders.

- [ ] **Step 4: Apply page headings and sticky actions**

Use `PageHeading` for room and editor titles. Place the existing action components inside `ActionDock` on room routes; keep confirmation dialogs, cancellation reasons, readiness resets, payment acknowledgements, refund wording, and admin-help timing untouched. Form routes remain normal document flow so keyboards do not fight a sticky submit control.

- [ ] **Step 5: Create transaction CSS**

Create `src/features/transactions/transaction-surfaces.css`:

```css
.trade-room, .trade-editor, .order-room, .order-editor, .refund-page { width: min(100%, 760px); margin-inline: auto; display: grid; gap: 20px; }
.trade-room .stage-rail, .order-room .stage-rail { margin: 8px 0 18px; }
.trade-package, .trade-item-editor, .trade-topup, .order-status-grid > *, .case-context { padding: 18px; border: 1px solid var(--rule); border-radius: var(--radius-md); background: var(--surface); }
.trade-item, .order-line { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 14px; padding: 14px 0; border-top: 1px solid var(--rule); }
.trade-item img, .trade-item .image-fallback { width: 76px; height: 76px; border-radius: 12px; object-fit: cover; }
.order-totals { border-top: 1px solid var(--rule); padding-top: 14px; }
.order-totals dd:last-child { color: var(--price); font-size: 1.25rem; }
.revision-warning, .inspection-notice, .simulation-warning { padding: 14px; border: 1px solid var(--warning); border-radius: 12px; color: var(--warning); background: var(--warning-bg); }
@media (min-width: 64rem) {
  .trade-room, .order-room { width: min(100%, 1120px); grid-template-columns: minmax(0, 1fr) minmax(320px, .6fr); align-items: start; }
  .trade-room > header, .trade-room > .stage-rail, .order-room > header, .order-room > .stage-rail { grid-column: 1 / -1; }
}
```

Import it in `src/main.tsx`.

- [ ] **Step 6: Run all barter and order page tests**

Run: `npm.cmd test -- src/features/trades/NewTradePage.test.tsx src/features/trades/TradeEditPage.test.tsx src/features/trades/TradeRoomPage.test.tsx src/features/orders/OrderRoomPage.test.tsx src/features/orders/OrderAmendmentPage.test.tsx src/features/orders/RefundPage.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit workflow surfaces**

```bash
git add src/features/trades src/features/orders src/features/transactions/transaction-surfaces.css src/main.tsx
git commit -m "feat: redesign barter and order workflows"
```

---

### Task 7: Finish notifications, reviews, reports, admin, and system states

**Files:**
- Modify: `src/features/notifications/NotificationsPage.tsx`
- Modify: `src/features/reviews/ReviewPage.tsx`
- Modify: `src/features/reviews/ReviewListPage.tsx`
- Modify: `src/features/reports/ReportPage.tsx`
- Modify: `src/features/admin/AdminReportsPage.tsx`
- Modify: `src/features/admin/AdminReportDetailPage.tsx`
- Modify: `src/features/admin/AdminSettingsLimitsPage.tsx`
- Modify: `src/features/admin/AdminAnalyticsPage.tsx`
- Modify: `src/features/shared/UnavailablePage.tsx`
- Modify: `src/components/StatusPanel.tsx`
- Create: `src/features/shared/support-surfaces.css`
- Modify: `src/main.tsx`
- Test: existing page tests listed below.

**Interfaces:**
- Consumes: `PageHeading` and existing `StatusPanel`.
- Produces: `aria-busy` on loading skeletons and a named admin navigation landmark.
- Preserves: read-state mutations, review submission and reply limits, report evidence, admin decisions, versioned platform limits, and aggregate analytics.

- [ ] **Step 1: Add failing state and admin-navigation assertions**

In `src/features/admin/AdminReportsPage.test.tsx`, add:

```tsx
expect(screen.getByRole('navigation', { name: 'Admin' })).toBeVisible();
```

In `src/app/App.test.tsx`, add this test:

```tsx
it('marks discovery loading as busy for assistive technology', async () => {
  const pendingRepository: DiscoveryRepository = {
    ...repo,
    searchListings: () => new Promise<never>(() => {}),
  };
  show('/', pendingRepository);
  expect(await screen.findByRole('status', { name: 'Memuat penawaran' })).toHaveAttribute('aria-busy', 'true');
});
```

- [ ] **Step 2: Run the focused tests and confirm the landmarks fail**

Run: `npm.cmd test -- src/features/admin/AdminReportsPage.test.tsx src/app/App.test.tsx`

Expected: FAIL because admin links are not a named navigation element and `LoadingRows` lacks `aria-busy`.

- [ ] **Step 3: Add the landmarks and shared heading treatment**

Change `LoadingRows` in `src/components/StatusPanel.tsx` to:

```tsx
export function LoadingRows() {
  return <div role="status" aria-label="Memuat penawaran" aria-busy="true" className="skeleton-list">{[1, 2, 3].map(id => <div className="skeleton-row" key={id}><span /><div><i /><i /></div></div>)}</div>;
}
```

Change `.admin-nav-links` in `AdminReportsPage` from a paragraph to `<nav className="admin-nav-links" aria-label="Admin">`. Use `PageHeading` in each listed page, preserving all existing copy and actions.

- [ ] **Step 4: Add support-surface CSS**

Create `src/features/shared/support-surfaces.css`:

```css
.notifications-page, .reviews-page, .report-page, .admin-reports-page, .admin-report-detail, .admin-settings-page, .admin-analytics-page { width: min(100%, 900px); margin-inline: auto; }
.notification-list, .review-list, .admin-report-list, .admin-history { border-top: 1px solid var(--rule); }
.notification-row, .review-card, .admin-report-list article { padding: 18px 0; border-bottom: 1px solid var(--rule); background: transparent; }
.notification-row.unread { padding-left: 14px; border-left: 4px solid var(--action); }
.review-reply, .case-context, .metrics-window, .metric-card { padding: 16px; border: 1px solid var(--rule); border-radius: 12px; background: var(--surface); }
.metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.metrics-grid strong { display: block; color: var(--action); font-size: clamp(1.4rem, 7vw, 2.4rem); }
.status-panel { min-height: 34vh; display: grid; align-content: center; justify-items: start; gap: 14px; }
.status-panel h2 { max-width: 18ch; font-size: clamp(1.8rem, 7vw, 3rem); line-height: 1.05; }
.skeleton-row > span, .skeleton-row i { background: var(--surface-strong); }
@media (min-width: 48rem) { .metrics-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
```

Import it last in `src/main.tsx`, except for the listing editor stylesheet, which remains the final route-specific layer.

- [ ] **Step 5: Run secondary and admin page suites**

Run: `npm.cmd test -- src/features/notifications/NotificationsPage.test.tsx src/features/reviews/ReviewPage.test.tsx src/features/reviews/ReviewListPage.test.tsx src/features/admin/AdminReportsPage.test.tsx src/features/admin/AdminReportDetailPage.test.tsx src/features/admin/AdminSettingsLimitsPage.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit secondary surfaces**

```bash
git add src/features/notifications src/features/reviews src/features/reports src/features/admin src/features/shared src/components/StatusPanel.tsx src/app/App.test.tsx src/main.tsx
git commit -m "feat: redesign support and admin surfaces"
```

---

### Task 8: Remove obsolete theme rules and verify the complete app

**Files:**
- Create: `tests/e2e/app-wide-visual.spec.ts`
- Modify: `src/app/styles.css`
- Modify: `src/app/focused-journey.css`
- Modify: `src/features/auth/auth-journey.css`
- Modify: `src/features/listings/listing-editor.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: all CSS and components from Tasks 1 through 7.
- Produces: one CSS source for each visual responsibility with no remaining purple palette.
- Preserves: the approved listing editor as the most immersive task screen.

- [ ] **Step 1: Write browser checks before cleanup**

Create `tests/e2e/app-wide-visual.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const publicRoutes = ['/', '/search', '/stores', '/auth/login', '/auth/register', '/unavailable'];

for (const route of publicRoutes) {
  test(`${route} uses the Barter field without horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 19, 24)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'Barter beranda' })).toBeVisible();
  });
}

test('mobile discovery keeps the primary action above the safe area', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('link', { name: 'Pasang' });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
});

test('listing detail keeps its action dock visible', async ({ page }) => {
  await page.goto('/listings/10000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('group', { name: 'Aksi penawaran' })).toBeInViewport();
  await expect(page.getByText('Lokasi tepat')).toBeVisible();
});
```

- [ ] **Step 2: Run the browser test and record any failing route**

Run: `npm.cmd run test:e2e -- tests/e2e/app-wide-visual.spec.ts`

Expected before cleanup: tests may fail where legacy white or purple declarations still override the new tokens. Record every route and selector in one fix list; do not patch one screenshot at a time.

- [ ] **Step 3: Remove obsolete theme duplication**

In `src/app/styles.css`, delete the old purple token values and route rules now owned by the five new stylesheets. In `focused-journey.css`, keep selection, focus, reduced-motion, and focused form/action behavior; remove its duplicate palette block. In `auth-journey.css` and `listing-editor.css`, retain only route-specific composition.

The final import order in `src/main.tsx` must be:

```tsx
import './app/styles.css';
import './app/app-shell.css';
import './features/discovery/discovery.css';
import './features/auth/account-surfaces.css';
import './features/chat/chat-surfaces.css';
import './features/transactions/transaction-surfaces.css';
import './features/shared/support-surfaces.css';
import './app/focused-journey.css';
import './features/auth/auth-journey.css';
import './features/listings/listing-editor.css';
```

Search for retired values:

Run: `rg -n "#6b21a8|#581c87|#f3e8ff|#d8b4fe|Solid Royal Purple|badge-purple" src`

Expected: no palette declarations remain. If `badge-purple` remains in JSX for API-independent label meaning, rename it to `badge-neutral` in the same commit and update its CSS.

- [ ] **Step 4: Run the full automated suite**

Run: `npm.cmd test`

Expected: all Vitest files pass.

Run: `npm.cmd run typecheck`

Expected: PASS.

Run: `npm.cmd run build:preview`

Expected: PASS. A Vite chunk-size advisory may remain, but there must be no TypeScript or build error.

Run: `npm.cmd run test:e2e -- tests/e2e/app-wide-visual.spec.ts`

Expected: PASS in `mobile-320`, `mobile-390`, and `desktop` projects.

- [ ] **Step 5: Perform one bounded visual review**

Start the preview server with `npm.cmd run dev:preview -- --port 5173 --strictPort`. Inspect these routes at 320 by 844, 390 by 844, and 1440 by 1000:

```text
/
/listings/10000000-0000-4000-8000-000000000001
/auth/register
/onboarding
/profile
/my/listings
/chat
/transactions
/notifications
/reviews
/admin/reports
```

For authenticated routes, use the existing test fixtures or authenticated local session; do not weaken `RequireCompletedProfile`. Fix the full batch of visible defects once, then confirm once. Check overflow, safe-area spacing, keyboard focus, dialog containment, 200% zoom, missing images, long Indonesian labels, disabled actions, and reduced motion.

- [ ] **Step 6: Run the Impeccable detector once**

Run:

```powershell
& 'C:/Users/plotsloee/.codex/plugins/cache/openai-curated-remote/impeccable/4.3.1/skills/impeccable/scripts/impeccable.cmd' detect --json src/app/styles.css src/app/app-shell.css src/components/SurfacePrimitives.tsx src/features/discovery/discovery.css src/features/auth/account-surfaces.css src/features/chat/chat-surfaces.css src/features/transactions/transaction-surfaces.css src/features/shared/support-surfaces.css
```

Expected: no unresolved detector findings. Fix concrete findings in one batch and rerun only the affected automated checks.

- [ ] **Step 7: Commit cleanup and verification**

```bash
git add src tests/e2e/app-wide-visual.spec.ts
git commit -m "test: verify app-wide mobile redesign"
```

---

## Final Verification

Run these commands from the repository root after the last commit:

```bash
npm.cmd test
npm.cmd run typecheck
npm.cmd run build:preview
npm.cmd run test:e2e -- tests/e2e/app-wide-visual.spec.ts
git status --short
```

Expected result: tests, typecheck, preview build, and the three Playwright viewport projects pass. `git status --short` may still show unrelated pre-existing user changes, but it must not show unstaged files from this plan.
