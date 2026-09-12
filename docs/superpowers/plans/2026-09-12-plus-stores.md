# Plus and optional stores plan

## Goal

Allow an account to activate the optional Plus entitlement through an explicitly labelled dummy QRIS/VA flow, then create up to three separate business profiles. Personal listings remain available without Plus.

## Invariants

- The database, not user metadata or client state, decides `plus_active`, expiry, price, and store quota.
- Dummy billing is server-gated and clearly labelled; no real transfer, QR, VA, gateway webhook, or payment claim is introduced.
- Repeating the same billing simulation is idempotent; a different invoice is a different entitlement attempt.
- Store owner is immutable and only an active subscription can create or expose a store.
- Expired Plus hides the catalogue from public discovery while preserving data and existing order access.

## TDD sequence

1. Add plan, subscription, dummy billing, store tables/RLS and pgTAP tests.
2. Add Plus/store gateway parser and tests.
3. Add mobile Plus status, simulation controls, store creation, and owner store list.
4. Wire account routes and run full regression/build/E2E.

## Deferred

Product promotion rotation, store catalogue editor, admin limit settings, and actual QRIS/VA integration remain separate. No UI may imply payment was received by Barter.
