---
version: 1
slug: "src-features-listings-listingeditorpage-tsx"
primary_target: "src/features/listings/ListingEditorPage.tsx"
related_targets: ["src/features/auth/LoginPage.tsx","src/features/auth/RequireCompletedProfile.tsx"]
---

# Mobile Auth-to-Listing Journey

Mode: Operate.

Scope: `/auth/login`, `/listings/new`, and `/my/listings/:id/edit`, including the authenticated return path, all four listing stages, final review, validation, draft saving, and publication feedback. Registration, onboarding behavior, backend contracts, listing rules, and non-listing application surfaces remain functionally unchanged.

Audience and job: a mobile resident of Jabodetabek signs in, describes one item accurately, sees what will be public or private, reviews the complete offer, and deliberately publishes it. Success is a confident publish without lost input, hidden errors, accidental disclosure, or uncertainty about whether the listing is live.

Content and constraints: use real application fields and state; item photography becomes visual material only after the user supplies it. Preserve Google and email/password login, profile-completion gating, four-stage validation, photo upload/retry/reorder, draft saving, unsaved-change protection, direct publication, and Indonesian copy. Reflow at 320 CSS pixels, support 200% text zoom, keyboard navigation, reduced motion, and WCAG AA text contrast.

## Direction contract

THESIS: One item owns the mobile screen and every control serves its path to publication. Refuse the generic centered white-card wizard, purple marketplace chrome, and social engagement rail; the visual drama comes from the user’s item, strong type, and decisive state color.

OWN-WORLD: Near-black `#111318` is the operating field, white carries primary text, electric lime `#D6FF4B` marks progress and the single primary action, and coral `#FF7A59` marks price or consequential emphasis. Item photography is full-bleed where available; controls are flat, high-contrast, thumb-sized, and separated by restrained hairlines. The four-stage rail is a navigation and status instrument, never decoration.

STORY: Login establishes trust and returns the user to the intended listing action. Each stage adds truth to one persistent listing record; once a photo exists it becomes the visual anchor. Review shows the item as neighbors will understand it, keeps private-location language visible, provides direct edit routes, and ends with one unambiguous publication action.

FIRST VIEWPORT: At 390px, the wordmark and stage title sit upper-left; the step rail occupies a narrow right edge; the primary item/photo or current decision fills the remaining upper field; essential facts descend in large labeled rows; and a full-width lime CTA stays reachable above the safe area. The approved final-review composition is `.impeccable/mocks/decision/challenger-video.png`. Before a photo exists, a bold offer-selection field occupies the same visual territory without fabricated imagery.

FORM: Full-viewport vertical media surface translated into an Operate flow; chosen catalog challenger `pop-culture-shelf-vertical-video-feed-surface` from seed `0aae11f9`. It was selected by the user from the decision comp and must preserve familiar form semantics rather than copying social-feed gestures or counters.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
