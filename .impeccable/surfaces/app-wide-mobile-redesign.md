---
version: 1
slug: "app-wide-mobile-redesign"
primary_target: "src/app/App.tsx"
related_targets: ["src/components/AppShell.tsx", "src/app/styles.css", "src/app/router.tsx"]
approved_comp: ".impeccable/mocks/app-wide-discovery.png"
supporting_comps: [".impeccable/mocks/app-wide-listing-detail.png", ".impeccable/mocks/app-wide-transaction-chat.png"]
approved_on: "2026-09-18"
---

# App-wide Mobile Redesign

Mode: Operate.

Apply the approved listing-editor world to every route. Mobile residents must be able to browse, inspect, chat, negotiate, confirm, and manage listings without crossing into a second visual system.

The global system is defined in `DESIGN.md`. The discovery comp sets shell, navigation, result hierarchy, and image density. The detail comp sets media-to-facts composition, privacy treatment, and paired actions. The transaction comp sets progress, conversation, contextual summaries, and sticky task actions.

Preserve route behavior, Indonesian product copy, privacy promises, error branches, accessibility semantics, and all existing backend contracts. Never turn generated product imagery from the comps into runtime content.
