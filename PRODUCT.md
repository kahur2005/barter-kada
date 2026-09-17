# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is mobile web users in Jabodetabek who want to sell, barter, or give away items within their surrounding community. The first redesign phase focuses on a signed-in resident creating a listing: choosing the offer, entering its details, reviewing it, and explicitly confirming publication.

Home-based businesses and UMKM owners are a secondary audience. A single account may act as a buyer, personal seller, and store owner.

## Product Purpose

Barter helps nearby residents discover, offer, exchange, and give away useful goods while helping small local businesses market products without building their own storefront. Success means a mobile user can confidently publish an accurate local listing and understand what will become public before confirming it.

## Positioning

Barter combines neighborhood discovery, selling, barter, and free giving in one marketplace. It protects exact personal locations, charges no platform fee on goods transactions, and keeps payments directly between users rather than acting as a payment intermediary.

## Operating Context

- Users primarily interact through mobile browsers and may be working from photos already stored on their phones.
- Listings use an approximate area and distance for public discovery; exact private locations are not published automatically.
- Users negotiate through private chat and complete payment or handover directly with one another.
- A listing may be published from a personal profile or an eligible Plus store.
- The listing workflow supports sale, barter, free giving, ready stock, pre-order, and catering, with fields that change according to the selected offer.

## Capabilities and Constraints

- Authentication uses Google OAuth or email and password through Supabase Auth.
- A completed profile and private location are required before publishing, chatting, or starting a transaction.
- The listing journey must preserve draft saving, field validation, photo upload and retry, primary-photo selection, unsaved-change protection, final review, and explicit publication confirmation.
- Valid listings publish immediately without admin approval.
- The product is a React and TypeScript web application using Vite, React Router, TanStack Query, Supabase, Vitest, Testing Library, and Playwright.
- The launch area is Jabodetabek, excluding Kepulauan Seribu.
- The current target is an integrated demonstration and limited trial, not production handling of real payments. Plus billing remains a clearly labeled simulation.

## Brand Commitments

- Product name: Barter.
- Primary language: clear, conversational Indonesian.
- Existing product line: “Dari sekitar, untuk sekitar.”
- The interface must feel designed for a trustworthy neighborhood marketplace rather than a generic e-commerce checkout or social-media feed.
- The redesign may replace the current visual language, but must preserve product terminology, content truth, privacy promises, and functional behavior.

## Evidence on Hand

- `docs/PRD.md` documents product requirements and open decisions.
- `docs/PDR-001-desain-produk.md` documents the incumbent mobile-first classified direction, interaction requirements, and acceptance criteria.
- `src/features/listings/ListingEditorPage.tsx` contains the working four-stage listing flow and its review-and-publish behavior.
- `src/features/listings/ListingEditorPage.test.tsx` verifies key listing behaviors and failure states.
- `public/assets/` contains existing category artwork, but no binding photography or mature brand asset library is present.
- Preview-mode content is synthetic and must not be presented as real customer, transaction, testimonial, or performance evidence.

## Product Principles

1. Mobile completion comes first: prioritize thumb reach, readable hierarchy, short decisions, and resilient progress on small screens.
2. Make trust visible: clearly distinguish public and private information, drafts and published listings, and simulated versus real operations.
3. Show local relevance early: area, handover expectations, and neighborhood context should remain easy to understand.
4. Preserve user effort: retain form content across navigation, explain validation failures precisely, and keep uploads retryable.
5. Add character without hiding utility: the visual world should feel lively and distinctive while listings remain fast to scan and actions remain unambiguous.

## Accessibility & Inclusion

- Support reflow at 320 CSS pixels without horizontal page scrolling and preserve functionality at 200% text zoom.
- Maintain at least WCAG AA contrast for ordinary text and visible focus states for interactive controls.
- Do not use color as the only status or error indicator.
- Keep permanent form labels, associated helper and error text, keyboard operability, and concise live-region feedback.
- Respect reduced-motion preferences and avoid animation that delays or obscures task completion.
