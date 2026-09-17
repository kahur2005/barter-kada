# Mobile Auth-to-Listing Redesign

Date: 17 September 2026  
Status: awaiting user review  
Approved direction: **Satu Barang Satu Layar**  
Approved comp: `.impeccable/mocks/decision/challenger-video.png`

## Purpose

Redesign the mobile journey from the protected “Pasang” action through login, listing creation, final review, and publication. The current behavior is capable but visually generic: a light card-and-form treatment, purple accents, and a horizontal stepper do not give the marketplace a memorable identity. The redesign must make the user’s item the visual center while preserving the trust, privacy, and recovery behavior already implemented.

The primary success case is a Jabodetabek resident using a phone to sign in, describe one item, understand what will be public, review the complete offer, and deliberately publish it without losing work.

## Scope

Included:

- `/auth/login`, including `returnTo=/listings/new` and all existing email, password, Google, loading, error, and preview states;
- `/listings/new` and `/my/listings/:id/edit`, because both routes share `ListingEditorPage`;
- the four existing stages: Penawaran, Detail, Ketersediaan, and Tinjau;
- draft saving, exit confirmation, upload progress and retry, primary-photo selection, validation, final publication, and publication feedback;
- the focused AppShell treatment used by the auth and listing routes;
- mobile layouts from 320 CSS pixels upward and a purposeful desktop adaptation;
- component, accessibility, integration, and visual verification.

Not included:

- changing authentication providers, Supabase contracts, listing validation rules, category taxonomy, store eligibility, publication limits, or database schema;
- redesigning discovery, listing detail, chat, transactions, onboarding, account, admin, or other unrelated routes;
- adding social-feed gestures, likes, shares, engagement counts, autoplay, swipe-only navigation, or full-screen scroll snapping;
- shipping the chair photo from the approved comp as real marketplace content;
- introducing a new UI framework, icon library, animation dependency, or remote font dependency.

## Product and Interaction Flow

1. A guest selects **Pasang** and the existing action gate redirects to `/auth/login?returnTo=/listings/new`.
2. Login keeps email/password and Google authentication. Success returns to the requested route; an incomplete account continues through the existing onboarding gate before entering the editor.
3. The editor retains one persistent draft across four stages. Earlier completed stages remain directly selectable; later stages remain locked until reached.
4. Penawaran collects publisher, transaction mode, category, and fulfillment. Before a photo exists, the upper visual field is an intentional dark decision surface, not synthetic marketplace imagery.
5. Detail collects the listing copy, condition, price/barter terms, variants, and photos. Once the user has a primary photo, that photo becomes the visual anchor for the rest of the flow.
6. Ketersediaan collects handover and conditional PO/catering information while keeping the selected item visible as context.
7. Tinjau presents a public-facing item preview, essential facts, exact-location privacy, and direct edit actions back to the relevant stage.
8. **Terbitkan penawaran** remains the only primary action on review. A successful call keeps the existing toast and navigation to `/my/listings`; a failed call preserves the draft and exposes the specific recovery path.

## Visual Direction

### Visual world

The surface uses a near-black operating field (`#111318`), white primary text, electric lime (`#D6FF4B`) for progress and the single primary action, and coral (`#FF7A59`) for price and consequential emphasis. Thin neutral dividers separate factual rows. The palette is scoped to the focused journey and does not silently recolor the rest of the application.

The approved comp is a spatial and hierarchy reference, not a bitmap to recreate as one image. The implementation must render semantic HTML, live fields, accessible buttons, and real user media. Item photography may be full-bleed only after the user supplies it.

### Mobile composition

- The wordmark and stage heading occupy the upper-left.
- A narrow vertical progress rail sits at the right edge and exposes all four stages, the current stage, and completed stages. It never contains social actions.
- The current item photo or stage decision owns the largest region of the first viewport.
- Required facts descend in large, high-contrast labeled rows.
- The current primary action stays within thumb reach above the safe area. It does not cover fields, errors, dialogs, or the on-screen keyboard.
- Photo scrims are limited to the image/text boundary and must not reduce item visibility.

At narrow widths or 200% zoom, the rail remains in normal document flow or compresses to numbers plus the active label; it must never overlap fields. At 320 CSS pixels, the page must not scroll horizontally.

### Desktop composition

At 768 CSS pixels and above, the editor becomes a two-region workspace: a sticky item/photo preview on the left and the active form or review content on the right. The same black, lime, coral, type hierarchy, and progress vocabulary remain. The mobile surface is not simply stretched into a wide empty column.

### Login composition

Login uses the same dark field, bold left-aligned hierarchy, restrained dividers, coral secondary emphasis, and lime primary action. It does not fabricate an item photo before the user has selected one. Email/password and Google remain equally discoverable; privacy copy and the return-to-listing intent remain visible. The standard global navigation, notification button, bottom navigation, and customer-support launcher are suppressed only on this focused journey so they do not compete with authentication or publication.

### Motion

Motion is short and functional:

- stage changes may cross-fade the contextual photo and shift the active rail indicator within 160–200 ms;
- upload progress remains explicit and numeric where available;
- the publish button may confirm the pressed/pending state without delaying the server request;
- `prefers-reduced-motion: reduce` removes the cross-fade and position transitions;
- content is visible by default and never depends on an entrance animation.

## Component Architecture

### AppShell focus state

`AppShell` identifies login and listing-editor routes as a focused journey. It adds scoped header and page classes, suppresses unrelated global controls on those routes, and preserves all existing navigation elsewhere. Route detection remains presentational; access control stays in `RequireCompletedProfile`.

### Listing editor decomposition

`ListingEditorPage` remains the state owner for the draft, mutations, stage navigation, gateway calls, and dialogs. Its render-heavy portions are separated into focused units:

- `ListingProgressRail`: accessible ordered stage navigation with reached/current/locked states;
- `ListingMediaHero`: primary-photo, upload, fallback, and stage-context presentation;
- `ListingReview`: semantic final preview with edit callbacks and privacy explanation;
- `listing-presenters`: pure label and currency presentation shared by the review and tests.

The split is by user-facing responsibility, not by technical layer. Gateway and validation interfaces remain unchanged.

### Styling boundary

New journey styles are scoped under focused auth/listing root classes in feature-local stylesheets. Existing global tokens and unrelated page styles stay in `src/app/styles.css`; current uncommitted support-chat styles must be preserved. The redesign may add journey-specific custom properties but must not globally replace `--action` or other tokens used by the rest of the application.

## State and Data Rules

- `ListingDraft` remains the single source of truth.
- Stage presentation derives from `stage`, `stageIssues`, and the existing validation function; no second form store is introduced.
- The first asset ID remains the primary photo. Local object URLs remain previews only and never become persisted listing data.
- Review edit actions set the relevant stage and move focus to that stage heading without clearing values.
- Final validation maps the first failing field to its owning stage, moves the user there, focuses the error summary, and retains every input and uploaded asset.
- Pending save, upload, login, and publish operations prevent duplicate submission while preserving readable button labels.
- Preview mode remains honest: the interface may be explored, but persistence and publication remain disabled with the existing explanation.

## Error and Edge States

- Invalid login credentials, unconfirmed email, and rate limiting remain inline alerts associated with the form.
- Missing or failed item photos use a deliberate dark fallback with descriptive text; they do not collapse the hero region.
- Upload failures retain selected files for retry and do not clear text fields.
- Server validation or quota errors keep the user in the editor and identify the owning stage.
- Offline state continues to use the AppShell notice and must remain visible above the focused surface.
- Unsaved exit continues to offer staying, discarding, or saving a draft.
- An active reserved listing continues to follow existing editing restrictions; the redesign does not infer permissions from color.
- Long titles, descriptions, store names, localized currency, and multiple photos must wrap or scroll inside their component rather than overflow the page.

## Accessibility

- Keep one visible `h1` per page and preserve semantic labels, fieldsets, legends, and ordered progress.
- The progress rail exposes `aria-current="step"`; locked stages are disabled, and reached stages remain keyboard operable.
- Touch targets are at least 44×44 CSS pixels, with 48 pixels preferred for primary controls.
- White/black, lime/black, and coral/black combinations must be checked at their actual text sizes; color is never the only stage or error signal.
- Focus indicators remain visible on the dark surface.
- Fixed actions must not trap focus or obscure focused inputs at 320 pixels, 200% zoom, or with the mobile keyboard open.
- The primary photo has meaningful alt text in review; decorative overlays remain hidden from assistive technology.

## Performance

- Add no runtime UI or motion dependency.
- Use the seller’s existing processed listing images; do not add a shipping hero raster for the listing flow.
- Reserve image aspect ratio to avoid layout shift and keep `object-fit` behavior intentional per stage.
- Keep animations on opacity and transform only, and disable them for reduced motion.
- Avoid placing the full editor behind expensive blur, filter, or continuously animated effects.

## Verification

Automated coverage must verify:

- unauthenticated `/listings/new` still reaches login and preserves its safe return route;
- successful login continues to the requested listing route;
- progress semantics, reached-stage navigation, and locked-stage behavior;
- all existing validation, draft, upload retry, primary-photo, store-publisher, and edit flows continue to pass;
- review edit actions return to the correct stage without losing the draft;
- a publish validation failure moves to the owning stage and exposes a focusable summary;
- final review renders photo/fallback, title, price, condition, handover, and privacy content;
- publication calls the existing gateway once and retains existing success/error outcomes.

Visual verification uses one bounded screenshot pass at 390×844 and 1440-pixel desktop width, plus 320-pixel reflow and 200% zoom checks. The implementation is compared directly with the approved comp for hierarchy, image dominance, stage rail, information rows, and CTA placement. One batched correction pass and one confirmation pass are the maximum before formal finish review.

## Acceptance Criteria

- The login-to-publish journey visibly belongs to the approved dark, image-led, lime/coral world.
- The final review is recognizably faithful to the approved comp while remaining semantic, responsive, and data-driven.
- A user can complete every existing listing type and recovery path on a mobile viewport without obscured controls or lost work.
- No unrelated route inherits the focused journey palette or layout.
- Existing auth, listing, typecheck, and build checks pass.
- The completed implementation receives the Impeccable detector pass, screenshot review, final verdict, and post-build design documentation required by the recorded surface contract.
