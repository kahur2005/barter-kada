# App-wide Mobile Redesign

## Goal

Extend the approved listing-editor identity across every current route while preserving data contracts, permissions, navigation destinations, form rules, mutations, and user-facing product truth. The result should feel like one Barter application instead of a redesigned listing flow inside an older purple shell.

The primary target remains a mobile browser at 390 by 844 pixels. The implementation must also reflow at 320 pixels and provide a deliberate desktop layout at 1024 pixels and above.

## Approved References

The user approved these comps on 18 September 2026:

- `.impeccable/mocks/app-wide-discovery.png`
- `.impeccable/mocks/app-wide-listing-detail.png`
- `.impeccable/mocks/app-wide-transaction-chat.png`

`DESIGN.md` converts their shared decisions into durable tokens and rules. The comps are composition references, not raster assets for the product UI.

## Scope

All routes in `src/app/router.tsx` are in scope, including discovery, listing and store details, authentication, onboarding, account, owned listings, stores, chat, barter, orders, refunds, transactions, notifications, reports, reviews, admin screens, setup failures, and unavailable states.

Business logic stays untouched unless a visual component needs a small semantic wrapper. The work does not change Supabase tables, API payloads, validation rules, authorization, limits, preview fixtures, or transaction state machines.

## UI Architecture

The global palette moves into `:root`; route-specific theme overrides disappear once their screens use the shared system. `AppShell` owns the dark page field, wordmark, responsive navigation, preview notice, main content region, and safe-area behavior.

Shared presentation components cover repeated structures:

- `PageHeading` for route title, supporting copy, and optional back action.
- `MediaCard` for listing and store results with stable image geometry.
- `FactRow` for condition, distance, location, privacy, and transaction facts.
- `StageRail` for real sequences such as listing publication and transaction progress.
- `ActionDock` for one primary and an optional secondary task action.
- Existing `StatusPanel`, `Dialog`, buttons, badges, fields, and notices receive the same tokens and state rules.

These components only handle markup and presentation. Feature pages continue to own queries, mutations, conditional fields, and route decisions.

## Surface Families

### Discovery and public detail

`/`, `/search`, and `/stores` gain the image-led discovery composition from the approved home comp. Search and category controls remain close to the heading; results use a responsive media grid. Listing details use full-width media followed by price, facts, publisher, privacy, description, and a sticky contact or barter action. Store details use the same grammar with the store identity taking the place of item price.

### Authentication, onboarding, and account

Login already uses the target world. Registration and onboarding adopt the same full-height dark field, display heading, field treatment, and bottom-reachable action. Account and management screens use grouped fact rows and separators instead of white cards.

### Owned listings and stores

Management lists keep their tabs, quota information, lifecycle badges, and available actions. Media thumbnails become more prominent, status stays readable without color, and the new-listing action remains easy to reach. Store setup, public preview, and Plus simulation use explicit notices so simulated billing cannot look real.

### Conversation and transactions

Chat follows the approved transaction comp. Current listing context remains visible, privacy messages stay outside person-authored bubbles, and the composer respects the safe area. Barter, order, amendment, refund, and transaction rooms use the same progress instrument, item summary, fact rows, inspection guidance, and sticky confirmation action. Existing confirmation dialogs and version-reset warnings remain.

### Notifications, reviews, reports, and admin

These routes use a denser reading layout while retaining the same palette and hierarchy. Lists use separators, clear unread or status markers, and restrained metadata. Admin analytics may use multi-column metric groups on wider screens, but mobile ordering and accessible labels stay primary.

## Responsive Rules

Below 768 pixels, the shell uses bottom navigation unless a focused route has an action dock. Page padding is 18 pixels, media may reach the viewport edge, controls stack before they shrink, and horizontal scrolling is limited to intentional tab or category strips.

At 768 pixels, the header navigation appears and bottom navigation leaves the layout. At 1024 pixels, detail and workflow pages may use a two-column grid with a sticky information or action column. Maximum content widths vary by job: reading and forms stay near 760 pixels, discovery can reach 1280 pixels, and chat stays narrow enough to read without long message lines.

## States and Errors

Loading, empty, permission, offline, and failure states keep their current branches and messages. Styling may add icons or layout wrappers, but recovery actions and live-region semantics remain. A missing image uses a labeled dark placeholder. Disabled actions must look unavailable without losing text contrast.

## Testing

Implementation follows test-first changes when markup or behavior changes. Component tests should cover shell navigation at focused routes, accessible names for new shared components, action-dock semantics, and status text that must remain visible. Existing feature tests protect behavior and copy branches.

Verification runs the full Vitest suite, TypeScript checking, the preview build, and route smoke checks. Browser review uses 320 by 844, 390 by 844, and 1440 by 1000 viewports. The final visual pass covers discovery, listing detail, registration or onboarding, account, owned listings, inbox, chat, one barter or order room, notifications, reviews, and one admin page; it also checks keyboard focus, sticky controls, overflow, and reduced motion.

## Completion Criteria

Every registered route renders inside the Barter visual system, and no page falls back to purple or a white canvas. Mobile screens have no unintended horizontal scrolling. Primary actions remain reachable, product photos keep stable geometry, private-location language stays visible where required, and existing tests plus build checks pass.
