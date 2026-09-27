# Mobile Auth-to-Listing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the protected login-to-publish journey into the approved dark, image-led, mobile-first experience while preserving every existing authentication, draft, upload, validation, and publication behavior.

**Architecture:** `AppShell` will identify focused auth/listing routes and suppress unrelated chrome only there. `ListingEditorPage` remains the single state owner, while pure presenters and three semantic view components handle the stage rail, media hero, and final review; feature-local styles supply the responsive visual system without changing global tokens.

**Tech Stack:** React 19, TypeScript 7, React Router 7, TanStack Query, Vitest, Testing Library, CSS, Vite 8

**Spec:** `docs/superpowers/specs/2026-09-17-mobile-auth-listing-redesign-design.md`

## Global Constraints

- Do not change authentication providers, Supabase contracts, listing validation rules, category taxonomy, store eligibility, publication limits, or database schema.
- Do not redesign discovery, listing detail, chat, transactions, onboarding, account, admin, or other unrelated routes.
- Do not add social-feed gestures, likes, shares, engagement counts, autoplay, swipe-only navigation, or full-screen scroll snapping.
- Do not ship the chair photo from the approved comp as real marketplace content.
- Do not introduce a new UI framework, icon library, animation dependency, or remote font dependency.
- Support mobile layouts from 320 CSS pixels upward and a purposeful desktop adaptation at 768 CSS pixels and above.
- Use `#111318` for the focused operating field, `#D6FF4B` for progress and the single primary action, and `#FF7A59` for price and consequential emphasis.
- Keep `ListingDraft` as the single source of truth and keep the first asset ID as the primary photo.
- Preserve draft saving, exit confirmation, upload progress and retry, primary-photo selection, validation, final publication, and publication feedback.
- Touch targets are at least 44×44 CSS pixels, with 48 pixels preferred for primary controls.
- Add no runtime UI or motion dependency; content remains visible by default and `prefers-reduced-motion: reduce` removes non-essential transitions.

---

## File Structure

- Create `src/features/listings/listing-presenters.ts`: pure stage ownership, currency, condition, fulfillment, and handover labels.
- Create `src/features/listings/listing-presenters.test.ts`: exact output and field-to-stage coverage.
- Create `src/features/listings/ListingProgressRail.tsx`: ordered, accessible reached/current/locked navigation.
- Create `src/features/listings/ListingProgressRail.test.tsx`: rail semantics and interaction coverage.
- Create `src/features/listings/ListingMediaHero.tsx`: photo/fallback visual anchor with stage context.
- Create `src/features/listings/ListingReview.tsx`: semantic public preview, fact rows, privacy copy, and edit callbacks.
- Create `src/features/listings/ListingReview.test.tsx`: review content, fallback, and edit-link coverage.
- Modify `src/features/listings/ListingEditorPage.tsx`: integrate components, stage focus, validation routing, and preserve gateway/state behavior.
- Modify `src/features/listings/ListingEditorPage.test.tsx`: end-to-end component coverage for progress, review editing, and validation recovery.
- Modify `src/components/AppShell.tsx`: focused-route detection, scoped classes, and chrome suppression.
- Modify `src/app/App.test.tsx`: focused/unfocused shell regression coverage.
- Modify `src/features/auth/LoginPage.tsx`: focused semantic copy/hooks without changing authentication behavior.
- Modify `src/features/auth/AuthFlow.test.tsx`: return-intent and visual-root semantics.
- Create `src/app/focused-journey.css`: shared dark header/page shell and responsive focus surface.
- Create `src/features/auth/auth-journey.css`: login composition.
- Create `src/features/listings/listing-editor.css`: mobile-first editor, review, hero, rail, and desktop workspace.
- Modify `src/main.tsx`: import focused styles after the existing global stylesheet.

### Task 1: Focused App Shell

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: React Router `pathname` from `useLocation()`.
- Produces: `focusedJourney: boolean`, `.focused-header`, `.focused-journey`, and suppression of desktop/bottom navigation, notifications, and `CustomerSupportChat` only on `/auth/*`, `/listings/new`, and `/my/listings/:id/edit`.

- [ ] **Step 1: Write the failing focused-shell regression test**

```tsx
it('removes competing chrome only from focused auth and listing journeys', async () => {
  const { unmount } = show('/auth/login');
  expect(document.querySelector('main')).toHaveClass('focused-journey');
  expect(screen.queryByRole('link', { name: /Notifikasi/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).not.toBeInTheDocument();
  unmount();

  show('/search');
  expect(document.querySelector('main')).not.toHaveClass('focused-journey');
  expect(screen.getByRole('link', { name: /Notifikasi/ })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- src/app/App.test.tsx`

Expected: FAIL because focused routes still render the global controls and do not expose the scoped class.

- [ ] **Step 3: Add route detection and scoped rendering**

```tsx
const focusedJourney =
  pathname.startsWith('/auth/') ||
  pathname === '/listings/new' ||
  /^\/my\/listings\/[^/]+\/edit$/.test(pathname);

<header className={`site-header${focusedJourney ? ' focused-header' : ''}`}>
  {/* keep the wordmark; render description, desktop nav, and notification only when !focusedJourney */}
</header>
<main id="main" className={`page-shell ${focusedJourney ? 'focused-journey' : shellSpacingClass}`}>
  {children}
</main>
{!focusedJourney && showBottomNav && <Navigation className="bottom-nav" />}
{!focusedJourney && <CustomerSupportChat />}
```

- [ ] **Step 4: Run the shell tests**

Run: `npm.cmd test -- src/app/App.test.tsx src/features/auth/AuthFlow.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit only the focused-shell hunks**

```powershell
git add -p -- src/components/AppShell.tsx src/app/App.test.tsx
git diff --cached --check
git commit -m "feat: add focused journey shell"
```

Do not stage the pre-existing `CustomerSupportChat` addition itself; only stage the conditional rendering and route-state hunks introduced by this task.

### Task 2: Listing Presentation Primitives

**Files:**
- Create: `src/features/listings/listing-presenters.ts`
- Create: `src/features/listings/listing-presenters.test.ts`
- Create: `src/features/listings/ListingProgressRail.tsx`
- Create: `src/features/listings/ListingProgressRail.test.tsx`

**Interfaces:**
- Produces: `export type ListingStage = 0 | 1 | 2 | 3`.
- Produces: `stageForListingField(field: string): ListingStage`.
- Produces: `formatRupiah(value: string | null): string`, `conditionLabel(value: ListingCondition | null): string`, `fulfillmentLabel(value: FulfillmentKind): string`, and `handoverLabel(values: HandoverMethod[]): string`.
- Produces: `ListingProgressRail({ current, furthestReached, onSelect }: { current: ListingStage; furthestReached: ListingStage; onSelect: (stage: ListingStage) => void })`.

- [ ] **Step 1: Write failing presenter tests**

```ts
expect(stageForListingField('title')).toBe(1);
expect(stageForListingField('preorder.orderClosesAt')).toBe(2);
expect(stageForListingField('modes')).toBe(0);
expect(stageForListingField('form')).toBe(3);
expect(formatRupiah('120000')).toBe('Rp 120.000');
expect(conditionLabel('good')).toBe('Baik');
expect(handoverLabel(['meetup', 'delivery'])).toBe('Meet up · Diantar');
```

- [ ] **Step 2: Run presenter tests to verify they fail**

Run: `npm.cmd test -- src/features/listings/listing-presenters.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement exact stage ownership and localized labels**

```ts
export type ListingStage = 0 | 1 | 2 | 3;

const stageOne = ['title', 'description', 'condition', 'defects', 'basePriceRupiah', 'negotiable', 'barter', 'variants', 'assetIds'];
const stageTwo = ['handoverMethods', 'preorder', 'catering'];

export function stageForListingField(field: string): ListingStage {
  if (stageOne.some(prefix => field === prefix || field.startsWith(`${prefix}.`))) return 1;
  if (stageTwo.some(prefix => field === prefix || field.startsWith(`${prefix}.`))) return 2;
  if (field === 'form') return 3;
  return 0;
}

export function formatRupiah(value: string | null): string {
  if (!value || !/^\d+$/.test(value)) return 'Harga belum diisi';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
}
```

- [ ] **Step 4: Write failing progress-rail semantics test**

```tsx
render(<ListingProgressRail current={1} furthestReached={2} onSelect={onSelect} />);
expect(screen.getByRole('list', { name: 'Tahap memasang penawaran' })).toBeVisible();
expect(screen.getByRole('button', { name: 'Tahap 2: Detail' })).toHaveAttribute('aria-current', 'step');
expect(screen.getByRole('button', { name: 'Tahap 3: Ketersediaan' })).toBeEnabled();
expect(screen.getByRole('button', { name: 'Tahap 4: Tinjau' })).toBeDisabled();
```

- [ ] **Step 5: Implement the ordered rail**

```tsx
export function ListingProgressRail({ current, furthestReached, onSelect }: Props) {
  return (
    <nav className="listing-progress" aria-label="Progres memasang penawaran">
      <ol aria-label="Tahap memasang penawaran">
        {listingStages.map((label, index) => {
          const stage = index as ListingStage;
          const reached = stage <= furthestReached;
          return (
            <li key={label} data-state={stage === current ? 'current' : reached ? 'reached' : 'locked'}>
              <button type="button" disabled={!reached} aria-current={stage === current ? 'step' : undefined} onClick={() => onSelect(stage)} aria-label={`Tahap ${index + 1}: ${label}`}>
                <span aria-hidden="true">{index + 1}</span><b>{label}</b>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 6: Run primitive tests**

Run: `npm.cmd test -- src/features/listings/listing-presenters.test.ts src/features/listings/ListingProgressRail.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/listings/listing-presenters.ts src/features/listings/listing-presenters.test.ts src/features/listings/ListingProgressRail.tsx src/features/listings/ListingProgressRail.test.tsx
git commit -m "feat: add listing presentation primitives"
```

### Task 3: Media Hero and Review

**Files:**
- Create: `src/features/listings/ListingMediaHero.tsx`
- Create: `src/features/listings/ListingReview.tsx`
- Create: `src/features/listings/ListingReview.test.tsx`

**Interfaces:**
- Consumes: `ListingStage`, `ListingDraft`, `assetPreviews: Record<string, string>`, and presenter functions from Task 2.
- Produces: `ListingMediaHero({ draft, stage, assetPreviews }: { draft: ListingDraft; stage: ListingStage; assetPreviews: Record<string, string> })`.
- Produces: `ListingReview({ draft, assetPreviews, onEdit }: { draft: ListingDraft; assetPreviews: Record<string, string>; onEdit: (stage: ListingStage) => void })`.

- [ ] **Step 1: Write failing review tests**

```tsx
render(<ListingReview draft={completeDraft} assetPreviews={{ [completeDraft.assetIds[0]]: 'blob:chair' }} onEdit={onEdit} />);
expect(screen.getByRole('heading', { name: 'Kursi kayu' })).toBeVisible();
expect(screen.getByText('Rp 120.000')).toBeVisible();
expect(screen.getByText('Baik')).toBeVisible();
expect(screen.getByText('Meet up')).toBeVisible();
expect(screen.getByText(/Lokasi tepat tetap privat/)).toBeVisible();
await user.click(screen.getByRole('button', { name: 'Edit detail penawaran' }));
expect(onEdit).toHaveBeenCalledWith(1);
```

Add a second test with an unknown persisted asset URL and assert that the deliberate text fallback is visible instead of an image with an empty `src`.

- [ ] **Step 2: Run the review test to verify it fails**

Run: `npm.cmd test -- src/features/listings/ListingReview.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the photo/fallback hero**

```tsx
const primaryAssetId = draft.assetIds[0];
const primarySrc = primaryAssetId ? assetPreviews[primaryAssetId] : undefined;

return (
  <figure className="listing-media-hero" data-has-photo={Boolean(primarySrc)}>
    {primarySrc ? <img src={primarySrc} alt={draft.title ? `Foto utama ${draft.title}` : 'Foto utama penawaran'} /> : <div className="listing-media-fallback"><span>{fallbackByStage[stage]}</span></div>}
    <figcaption><span>Tahap {stage + 1}</span><strong>{draft.title || 'Barangmu jadi pusat cerita'}</strong></figcaption>
  </figure>
);
```

- [ ] **Step 4: Implement the semantic review**

Render one visible `h2` for the item title, a coral price, three factual `<dl>` rows for condition, transaction/fulfillment, and location privacy, thumbnail/fallback media, and secondary edit buttons whose accessible names are `Edit penawaran`, `Edit detail penawaran`, and `Edit ketersediaan`.

```tsx
<button type="button" className="review-edit" onClick={() => onEdit(1)}>Edit detail penawaran</button>
```

- [ ] **Step 5: Run review tests**

Run: `npm.cmd test -- src/features/listings/ListingReview.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/listings/ListingMediaHero.tsx src/features/listings/ListingReview.tsx src/features/listings/ListingReview.test.tsx
git commit -m "feat: add listing media hero and review"
```

### Task 4: Integrate the Immersive Listing Editor

**Files:**
- Modify: `src/features/listings/ListingEditorPage.tsx`
- Modify: `src/features/listings/ListingEditorPage.test.tsx`

**Interfaces:**
- Consumes: all Task 2 and Task 3 exports.
- Produces: `furthestReached: ListingStage`, `selectStage(next: ListingStage): void`, and focusable `#listing-stage-heading` / `#listing-errors` targets.

- [ ] **Step 1: Write failing journey tests**

Add tests that assert:

```tsx
expect(screen.getByRole('button', { name: 'Tahap 4: Tinjau' })).toBeDisabled();
// Complete stages using the existing form helpers, reach Tinjau, then:
await user.click(screen.getByRole('button', { name: 'Edit detail penawaran' }));
expect(screen.getByRole('heading', { name: 'Ceritakan barangmu' })).toHaveFocus();
expect(screen.getByDisplayValue('Kursi kayu')).toBeVisible();
```

For validation recovery, render a draft whose first publication issue belongs to stage 1, press the review publish action, and assert `Tahap 2: Detail` is current and `#listing-errors` receives focus without losing the entered title or assets.

- [ ] **Step 2: Run the editor tests to verify failure**

Run: `npm.cmd test -- src/features/listings/ListingEditorPage.test.tsx`

Expected: FAIL because the integrated rail, edit callbacks, and validation focus routing do not exist.

- [ ] **Step 3: Replace the inline wizard/review with focused components**

```tsx
const [stage, setStage] = useState<ListingStage>(listingId ? 1 : 0);
const [furthestReached, setFurthestReached] = useState<ListingStage>(listingId ? 3 : 0);
const stageHeadingRef = useRef<HTMLHeadingElement>(null);
const errorSummaryRef = useRef<HTMLDivElement>(null);

function selectStage(nextStage: ListingStage) {
  if (nextStage > furthestReached) return;
  setStage(nextStage);
  requestAnimationFrame(() => stageHeadingRef.current?.focus());
}
```

Render `ListingMediaHero` and `ListingProgressRail` before the stage panel. Render `ListingReview` only for stage 3. Keep the existing form controls, gateway calls, upload state, exit dialog, and preview restrictions unchanged.

- [ ] **Step 4: Route validation to the first owning stage**

```tsx
function exposeValidation(validation: ListingValidationIssue[]) {
  setIssues(validation);
  if (validation.length === 0) return;
  const owner = stageForListingField(validation[0].field);
  setStage(owner);
  setFurthestReached(current => Math.max(current, owner) as ListingStage);
  requestAnimationFrame(() => errorSummaryRef.current?.focus());
}
```

Call `exposeValidation` from `publish()` and active-listing save validation. Make the summary `tabIndex={-1}` and label it with a visible heading. Do not mutate `draft` during stage changes.

- [ ] **Step 5: Run editor and existing listing suites**

Run: `npm.cmd test -- src/features/listings/ListingEditorPage.test.tsx src/features/listings/validation.test.ts src/features/listings/gateway.test.ts`

Expected: PASS, including all existing upload retry, draft, edit, store, and unsaved-exit cases.

- [ ] **Step 6: Commit only the editor integration**

```powershell
git add src/features/listings/ListingEditorPage.tsx src/features/listings/ListingEditorPage.test.tsx
git commit -m "feat: integrate immersive listing editor"
```

### Task 5: Focused Login Experience

**Files:**
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/features/auth/AuthFlow.test.tsx`

**Interfaces:**
- Consumes: the existing validated `returnTo` value and authentication gateway.
- Produces: `.auth-card--focused`, visible listing-return intent, and unchanged sign-in behavior.

- [ ] **Step 1: Write the failing login-intent test**

```tsx
show('/auth/login?returnTo=/listings/new', auth);
expect(screen.getByText('Lanjutkan untuk memasang penawaranmu.')).toBeVisible();
expect(screen.getByRole('region', { name: 'Masuk ke Barter' })).toHaveClass('auth-card--focused');
```

- [ ] **Step 2: Run the auth test to verify it fails**

Run: `npm.cmd test -- src/features/auth/AuthFlow.test.tsx`

Expected: FAIL because the focused class and return-intent copy are absent.

- [ ] **Step 3: Add focused hooks and honest intent copy**

```tsx
<section className="auth-card auth-card--focused" aria-labelledby="login-title">
  <p className="eyebrow">Akun warga</p>
  <h1 id="login-title">Masuk, lalu pasang barangmu.</h1>
  {returnTo === '/listings/new' && <p className="auth-intent">Lanjutkan untuk memasang penawaranmu.</p>}
```

Keep the same field names, validation, Google callback, safe return-path check, pending lock, and translated errors.

- [ ] **Step 4: Run auth coverage**

Run: `npm.cmd test -- src/features/auth/AuthFlow.test.tsx src/features/auth/ActionGate.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/auth/LoginPage.tsx src/features/auth/AuthFlow.test.tsx
git commit -m "feat: restyle listing login entry"
```

### Task 6: Responsive Visual System

**Files:**
- Create: `src/app/focused-journey.css`
- Create: `src/features/auth/auth-journey.css`
- Create: `src/features/listings/listing-editor.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: scoped classes introduced by Tasks 1, 3, 4, and 5.
- Produces: 320px-safe mobile layout, sticky thumb-zone actions, 768px two-region workspace, visible focus, reduced motion, and no changes to unrelated route styling.

- [ ] **Step 1: Import the three scoped styles after the global stylesheet**

```ts
import './app/styles.css';
import './app/focused-journey.css';
import './features/auth/auth-journey.css';
import './features/listings/listing-editor.css';
```

- [ ] **Step 2: Implement the shared focused surface**

```css
.focused-header,
.focused-journey {
  --focus-bg: #111318;
  --focus-panel: #191c22;
  --focus-text: #ffffff;
  --focus-muted: #9c9faa;
  --focus-lime: #d6ff4b;
  --focus-coral: #ff7a59;
  --focus-line: #343840;
  background: var(--focus-bg);
  color: var(--focus-text);
}

.focused-journey {
  max-width: none;
  min-height: calc(100dvh - 4rem);
  padding: 0;
}
```

- [ ] **Step 3: Implement mobile login and listing composition**

Use `clamp()` for headings, `minmax(0, 1fr)` to prevent overflow, a hero `aspect-ratio` reservation, 44px minimum rail targets, and a sticky/fixed action bar with `padding-bottom: calc(1rem + env(safe-area-inset-bottom))`. The primary lime button must remain black-on-lime and the price must use coral.

- [ ] **Step 4: Add purposeful desktop adaptation and reduced motion**

```css
@media (min-width: 48rem) {
  .listing-editor--immersive {
    display: grid;
    grid-template-columns: minmax(20rem, 0.9fr) minmax(28rem, 1.1fr);
    min-height: calc(100dvh - 4rem);
  }
  .listing-editor-visual { position: sticky; top: 0; align-self: start; min-height: calc(100dvh - 4rem); }
}

@media (prefers-reduced-motion: reduce) {
  .listing-editor--immersive *, .auth-card--focused * { scroll-behavior: auto; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 5: Run structural and compilation checks**

Run: `npm.cmd run typecheck`

Expected: PASS.

Run: `npm.cmd test -- src/app/App.test.tsx src/features/auth/AuthFlow.test.tsx src/features/listings/ListingEditorPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit scoped styles without staging `src/app/styles.css`**

```powershell
git add src/main.tsx src/app/focused-journey.css src/features/auth/auth-journey.css src/features/listings/listing-editor.css
git commit -m "style: add mobile listing journey visual system"
```

### Task 7: Browser Acceptance and Regression Verification

**Files:**
- Modify after the bounded browser pass, only when an observed acceptance failure requires it: files from Tasks 1–6
- Create: `DESIGN.md`
- Create: `.impeccable/design.json`

**Interfaces:**
- Consumes: the complete implementation and approved comp `.impeccable/mocks/decision/challenger-video.png`.
- Produces: verified mobile/desktop UI and recorded design-system documentation.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm.cmd test -- --run`

Expected: 48+ test files pass, including all newly added files.

Run: `npm.cmd run typecheck`

Expected: PASS.

Run: `npm.cmd run build:preview`

Expected: PASS with a production bundle.

- [ ] **Step 2: Run the Impeccable detector once on changed UI targets**

```powershell
& 'C:\Users\plotsloee\.codex\plugins\cache\openai-curated-remote\impeccable\4.3.1\skills\impeccable\scripts\impeccable.cmd' detect --json src/components/AppShell.tsx src/features/auth/LoginPage.tsx src/features/listings/ListingEditorPage.tsx src/features/listings/ListingProgressRail.tsx src/features/listings/ListingMediaHero.tsx src/features/listings/ListingReview.tsx src/app/focused-journey.css src/features/auth/auth-journey.css src/features/listings/listing-editor.css
```

Expected: no new high-severity detectable design problems; address substantive warnings without weakening the approved identity.

- [ ] **Step 3: Verify the live flow in a real browser**

Start: `npm.cmd run dev:preview`

Capture one bounded screenshot pass at 390×844 and 1440×1000. Also inspect 320×844 and 200% zoom for horizontal overflow, rail overlap, clipped focus, and CTA obstruction. Compare the review directly to the approved comp for image dominance, dark operating field, right-side progress, factual rows, coral price, and lime CTA.

- [ ] **Step 4: Perform one batched correction pass**

Fix only issues observed in the screenshot/reflow pass, then repeat one confirmation pass at the same viewports. Do not iterate by unbounded screenshot tweaking.

- [ ] **Step 5: Run formal finish review and full verification again**

Request code/design review against the spec and current diff. Resolve all critical and important findings. Re-run `npm.cmd test -- --run`, `npm.cmd run typecheck`, and `npm.cmd run build:preview` after the final correction.

- [ ] **Step 6: Record the shipped design language**

Create `DESIGN.md` and `.impeccable/design.json` from the finished implementation, documenting palette, typography, spacing, components, responsive behavior, motion, accessibility, and the focused-journey scoping boundary.

- [ ] **Step 7: Inspect the final diff without staging unrelated work**

```powershell
git status --short
git diff --check
git diff -- src/components/AppShell.tsx src/features/auth/LoginPage.tsx src/features/listings/ListingEditorPage.tsx src/main.tsx
```

Expected: no whitespace errors, no auth/gateway/schema changes, and the pre-existing support-chat, migration, Vite, and Supabase test changes remain intact.
