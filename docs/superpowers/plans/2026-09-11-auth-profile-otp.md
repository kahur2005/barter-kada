# Auth, Profile, Location, and WhatsApp OTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real Supabase Google/email authentication, private onboarding data and location boundaries, and server-verified WhatsApp OTP delivery through rmyndharis/OpenWA without exposing credentials or precise user data.

**Architecture:** Supabase Auth owns identity; public profile fields live in `public`, while account state, phone claims, precise locations, and OTP challenges live in a non-exposed `private` schema. Browser mutations call narrowly granted RPCs; an authenticated Edge Function verifies the user JWT, creates/validates OTP challenges through service-only RPCs, and calls OpenWA after the database transaction has committed. Preview mode never invents a session or verified phone.

**Tech Stack:** React 19, React Router 7, Supabase JS 2.116.0, Supabase CLI 2.117.0, PostgreSQL 17/PostGIS, Supabase Edge Functions, rmyndharis/OpenWA REST API, Zod, Vitest/Testing Library, pgTAP, Playwright.

**Spec:** `docs/PRD.md` §§4–5 and 16; `docs/RFC-001-arsitektur-barter.md` §§5, 6.1, 10.2–10.3, 11; `docs/PDR-001-desain-produk.md` UI-03; `docs/RFC-001-matriks-cakupan.md` T-01/T-12/T-20/T-21/T-22/T-23.

## Global Constraints

- Google OAuth and email/password are login methods. WhatsApp OTP verifies phone ownership; it is not a Supabase phone-login flow and is not identity verification.
- Google users do not create a Barter password. Every user must complete name, location, and WhatsApp verification before posting, chatting, or transacting.
- Browser configuration contains only Supabase URL and publishable key. OpenWA API key/session, service key, and OTP pepper are server-only secrets.
- OTP defaults follow the PRD proposal: six digits, five-minute expiry, one use, 60-second resend cooldown, five attempts, and bounded sends. These values live in one private configuration row so the later operations stage can version them.
- Indonesian numbers normalize to E.164 `+62…`; one active verified number belongs to at most one active account. Error responses never identify the account already using a number.
- Precise `geography(Point,4326)` and private address never appear in public tables, public DTOs, logs, analytics, events, URLs, or browser cache. An optional street-address field implements the PRD recommendation while Q-01 remains open.
- Location publishing is restricted to an enabled service-area polygon. Kepulauan Seribu is not seeded/enabled. Administrative boundary data must include source/version; this task creates the model and test polygon, not fabricated production boundaries.
- All exposed tables enable RLS and have explicit grants. Policies use `(select auth.uid())`; UPDATE has `USING` and `WITH CHECK`. Authorization never reads user-editable metadata.
- `SECURITY DEFINER` functions stay in `private`, pin `search_path = ''`, have explicit actor checks, and revoke default PUBLIC execution. Public wrappers use `SECURITY INVOKER`.
- OpenWA network calls happen after challenge commit and never while holding a database lock. API acceptance becomes `accepted`, not “delivered” or “verified”.
- Docker-backed SQL verification is mandatory before this subsystem is marked complete. With Docker unavailable, code may advance but SQL/RLS integration remains explicitly unverified.

---

### Task 1: Supabase local project and identity/privacy schema

**Files:**
- Create via CLI: `supabase/config.toml`
- Create via CLI, then edit: `supabase/migrations/<generated>_identity_profile_location_otp.sql`
- Create: `supabase/tests/identity_profile_location_otp.test.sql`
- Create: `supabase/seed.sql`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces public RPCs `get_my_onboarding()`, `complete_profile(p_display_name, p_bio)`, and `set_location(p_area_id, p_latitude, p_longitude, p_address)`.
- Produces service-only RPCs `otp_create_challenge`, `otp_record_delivery`, and `otp_verify_challenge` for the Edge Function.
- Produces public `profiles` and `service_areas`, plus private `account_state`, `phone_claims`, `user_locations`, `otp_policy`, and `otp_challenges`.

- [ ] **Step 1: Initialize Supabase using the current CLI**

Run `npm.cmd exec --yes --package=supabase@2.117.0 -- supabase init --yes`, inspect generated config, then run `supabase migration new identity_profile_location_otp`. Do not invent the timestamped filename.

- [ ] **Step 2: Write failing pgTAP policy and invariant tests**

Tests create two `auth.users`, set `request.jwt.claim.sub`, and prove:

```sql
select throws_ok(
  $$ update private.account_state set account_status = 'active' $$,
  '42501',
  null,
  'authenticated users cannot directly change account state'
);

select lives_ok(
  $$ select public.complete_profile('Rina', 'Masakan rumahan') $$,
  'owner completes public profile through the command'
);

select is_empty(
  $$ select * from private.user_locations where user_id <> auth.uid() $$,
  'one user cannot read another exact location'
);

select throws_ok(
  $$ select public.set_location('outside-area', -6.0, 107.0, null) $$,
  'P0001', 'LOCATION_OUTSIDE_SERVICE_AREA',
  'publishing outside an enabled polygon is rejected'
);
```

The test transaction inserts a synthetic polygon labelled `test-only`; `supabase/seed.sql` does not publish a guessed Jabodetabek boundary.

- [ ] **Step 3: Run SQL tests to verify RED**

Run `supabase start`, then `supabase test db`. Expected: failures because schemas/tables/functions are absent. If Docker remains unavailable, record the exact engine error and continue only with static migration authoring; do not mark this task green.

- [ ] **Step 4: Implement schemas, constraints, indexes, grants, and RLS**

Migration shape:

```sql
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create extension if not exists postgis schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_asset_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  area_id text not null references public.service_areas(area_id),
  exact_point extensions.geography(point, 4326) not null,
  address text check (address is null or char_length(address) <= 300),
  updated_at timestamptz not null default statement_timestamp()
);
```

Create named checks for account/onboarding/purpose/delivery states, unique partial indexes for active phone by number and user, foreign-key indexes, OTP expiry/actor indexes, and a trigger that creates blank profile/account-state rows after `auth.users` insert without trusting `raw_user_meta_data` for authorization.

Grant anon/authenticated SELECT only on safe public rows. Grant authenticated only the explicit RPCs and owner-private SELECT needed by the invoker read model. Revoke direct DML and all default function execution. Private command functions check `auth.uid() is not null`, enforce ownership and lengths, then refresh onboarding status based on profile/location/phone state.

- [ ] **Step 5: Implement atomic OTP database commands**

`otp_create_challenge` accepts a pre-generated UUID/digest, actor, E.164 number, purpose, expiry, and IP hash from the verified Edge Function. It invalidates old unconsumed challenges, enforces cooldown/hour limits under an actor lock, and inserts `pending_delivery` before returning.

`otp_verify_challenge` locks the challenge, returns a status instead of raising for wrong/expired/used codes, increments failed attempts in a committed statement, and for a match atomically consumes the challenge plus inserts/replaces the actor's active phone claim. Partial unique indexes resolve two-account races without exposing the competing user ID.

- [ ] **Step 6: Verify schema and advisors**

Run `supabase db reset`, `supabase test db`, `supabase db advisors --local`, and `supabase migration list --local`. Inspect every exposed table/function grant and verify no private coordinates occur in public relation/function result definitions.

- [ ] **Step 7: Commit Task 1**

Commit `feat: add private identity and onboarding schema` only after SQL tests and advisors pass. If Docker is still unavailable, leave changes uncommitted or commit with an explicit unverified ledger entry, and keep Task 1 incomplete.

---

### Task 2: OTP core and OpenWA Edge adapter

**Files:**
- Create: `supabase/functions/_shared/http.ts`
- Create: `supabase/functions/_shared/auth.ts`
- Create: `supabase/functions/_shared/phone.ts`
- Create: `supabase/functions/_shared/otp-crypto.ts`
- Create: `supabase/functions/_shared/openwa.ts`
- Create: `supabase/functions/_shared/*.test.ts`
- Create: `supabase/functions/otp/index.ts`
- Modify: `supabase/config.toml`
- Modify: `vitest.config.ts`
- Create: `supabase/functions/.env.example`

**Interfaces:**

```ts
export function normalizeIndonesianPhone(input: string): string;
export function createOtpCode(randomValues?: (array: Uint32Array) => Uint32Array): string;
export function otpDigest(input: { challengeId: string; userId: string; phone: string; purpose: OtpPurpose; code: string }, pepper: string): Promise<string>;
export interface OpenWaGateway {
  sendOtp(input: { phoneE164: string; code: string; challengeId: string }, signal?: AbortSignal): Promise<{ status: 'accepted' | 'failed' | 'unknown'; reference: string | null }>;
}
```

- [ ] **Step 1: Write failing normalization, crypto, and gateway tests**

Tests verify `0812…`, `62812…`, and `+62 812…` normalize to one E.164 value; malformed/non-Indonesian numbers fail; codes are six-digit strings; HMAC changes with challenge/user/purpose; and no thrown message includes code/API key.

The OpenWA test injects a real `fetch`-compatible spy and asserts:

```ts
expect(request.url).toBe(`${baseUrl}/api/sessions/${sessionId}/messages/send-text`);
expect(request.headers.get('X-API-Key')).toBe(apiKey);
expect(await request.json()).toEqual({
  chatId: '628123456789@c.us',
  text: expect.stringContaining('Kode verifikasi Barter'),
});
expect(result.status).toBe('accepted');
```

It also covers timeout/network `unknown`, 4xx/5xx `failed`, malformed success response, and ensures acceptance is never named delivered/verified.

- [ ] **Step 2: Run focused tests to verify RED**

Run `npm.cmd test -- supabase/functions/_shared`. Expected assertion failures from empty stubs, not module-resolution errors.

- [ ] **Step 3: Implement pure helpers and OpenWA adapter**

Use Web Crypto HMAC-SHA-256 and rejection sampling for six digits. Build OpenWA `chatId` by removing the leading `+` and adding `@c.us`. Pin the provider contract to the current rmyndharis/OpenWA endpoint, `X-API-Key`, `{chatId,text}`, and a bounded `AbortSignal.timeout`.

- [ ] **Step 4: Implement authenticated `otp` Edge Function**

The handler accepts only POST JSON:

```ts
type OtpRequest =
  | { action: 'request'; phone: string; purpose: 'register' | 'change_phone' }
  | { action: 'verify'; challengeId: string; code: string };
```

It requires `Authorization: Bearer <user JWT>`, validates the user with Supabase Auth, derives actor ID from that result, and never accepts actor ID in the body. Request creates/digests/commits the challenge, then calls OpenWA and records the acceptance/failure/unknown status. Verify computes the digest and calls the atomic service RPC. CORS uses an explicit configured origin; responses are cache-disabled generic envelopes with no phone owner, code, digest, key, or provider body.

- [ ] **Step 5: Verify functions locally**

Run shared Vitest tests, `supabase functions serve otp --env-file supabase/functions/.env.local`, then invoke request/verify with a provisioned local test user. A real OpenWA send is performed only after an operator supplies a dedicated test session/key and authorized recipient; otherwise record provider delivery as not integration-tested.

- [ ] **Step 6: Commit Task 2**

Commit `feat: add secure WhatsApp OTP service` with no `.env.local`, API key, pepper, phone, or OTP values.

---

### Task 3: Supabase Auth session and login/register UI

**Files:**
- Create: `src/features/auth/types.ts`
- Create: `src/features/auth/gateway.ts`
- Create: `src/features/auth/AuthProvider.tsx`
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/features/auth/RegisterPage.tsx`
- Create: `src/features/auth/AuthCallbackPage.tsx`
- Create: `src/features/auth/*.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/main.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**

```ts
export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  subscribe(listener: (session: AuthSession | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(email: string, password: string, redirectTo: string): Promise<'signed_in' | 'confirmation_required'>;
  signInWithGoogle(redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}
```

- [ ] **Step 1: Write failing gateway/provider/page tests**

Tests exercise the real page with an injected gateway: email/password validation, register confirmation message, Google redirect URL `/auth/callback`, session initialization, error preservation, sign-out, and preview mode explaining that login is unavailable rather than inventing an account.

- [ ] **Step 2: Verify RED, then implement the smallest gateway/provider**

The Supabase gateway delegates to `auth.getSession`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `signInWithOAuth({provider:'google'})`, and `signOut`. Map provider errors to stable Indonesian messages without rendering raw backend strings. Do not derive authorization/profile completion from `user_metadata`.

- [ ] **Step 3: Implement routes and forms**

Add `/auth/login`, `/auth/register`, and `/auth/callback`. Inputs have persistent labels, `autocomplete`, 16 px text, pending/disabled states, an alert summary, password minimum policy helper, and links between login/register. Callback waits for session then asks the onboarding RPC for the next incomplete step; it does not treat an OAuth redirect alone as complete onboarding.

- [ ] **Step 4: Verify React and browser behavior**

Run focused unit tests, typecheck/build, and Playwright keyboard/reflow checks. Preview auth must stay nonfunctional and clearly labelled; Supabase mode requires configured origin/redirect allowlist.

- [ ] **Step 5: Commit Task 3**

Commit `feat: add Supabase email and Google authentication`.

---

### Task 4: Profile, private location, and OTP onboarding UI

**Files:**
- Create: `src/features/onboarding/types.ts`
- Create: `src/features/onboarding/gateway.ts`
- Create: `src/features/onboarding/OnboardingPage.tsx`
- Create: `src/features/onboarding/*.test.tsx`
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/app/styles.css`
- Modify: `tests/e2e/discovery.spec.ts`
- Create: `tests/e2e/onboarding.spec.ts`

**Interfaces:**

```ts
type OnboardingState = {
  nextStep: 'profile' | 'location' | 'phone' | 'complete';
  displayName: string;
  bio: string | null;
  areaId: string | null;
  maskedPhone: string | null;
  phoneVerified: boolean;
};

export interface OnboardingGateway {
  getState(): Promise<OnboardingState>;
  completeProfile(input: { displayName: string; bio: string | null }): Promise<OnboardingState>;
  setLocation(input: { areaId: string; latitude: number; longitude: number; address: string | null }): Promise<OnboardingState>;
  requestOtp(input: { phone: string; purpose: 'register' | 'change_phone' }): Promise<{ challengeId: string; expiresAt: string; resendAt: string; deliveryStatus: 'accepted' | 'failed' | 'unknown' }>;
  verifyOtp(input: { challengeId: string; code: string }): Promise<OnboardingState>;
}
```

- [ ] **Step 1: Write failing onboarding tests**

Cover the three labelled stages “Data diri → Lokasi → Verifikasi WhatsApp”, name length/error retention, optional address, manual enabled-area selection, no automatic geolocation prompt, one semantic OTP input (`inputMode=numeric`, `autocomplete=one-time-code`), masked phone, resend countdown from server time, wrong/expired/used/rate-limited/provider-unavailable states, and no verified UI after request acceptance.

- [ ] **Step 2: Verify RED and implement gateway**

RPC state/profile/location calls use the user session and validated response schemas. OTP calls `supabase.functions.invoke('otp')`; it separates HTTP transport, delivery status, and verification result. Abort stale state loads and clear private query caches on sign-out.

- [ ] **Step 3: Implement onboarding pages and action gates**

Implement one responsive page with three short sections and server-authoritative progression. Google display name may prefill the input for convenience but only the saved profile row determines completion. Add a `RequireCompletedProfile` gate for posting/chat/transaction routes that preserves the safe return path; public discovery stays guest-accessible.

- [ ] **Step 4: Verify full local flow**

With local Supabase running, create two test users, complete profile/location, verify one via a provisioned test challenge, confirm the second cannot claim the same number, and assert direct reads of another user's phone/location fail. Run Playwright at 320/390/1280 plus keyboard checks; do not use a fake verified state for integration proof.

- [ ] **Step 5: Commit Task 4**

Commit `feat: add private account onboarding flow`.

---

### Task 5: Documentation and subsystem verification

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION.md`
- Create: `docs/contracts/auth-profile-otp.md`

- [ ] **Step 1: Document environment and operator setup**

Document Supabase local commands, Google/email redirect URLs, public vs server-only variables, OpenWA dedicated session/operator key, and safe test-recipient requirements. State that OpenWA is an unofficial WhatsApp gateway with account-restriction risk; use a dedicated number and never the operator's primary personal account.

- [ ] **Step 2: Run fresh subsystem gates**

Run `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:e2e`, `supabase db reset`, `supabase test db`, `supabase db advisors --local`, and Edge Function smoke tests. Inspect generated API types and all grants/RLS. Run `git diff --check` and a staged secret scan.

- [ ] **Step 3: Update the implementation ledger accurately**

Mark stage 2 complete only when Auth, profile/location privacy, SQL policies, and OTP request/verify are integrated and verified. If OpenWA credentials or Docker are unavailable, distinguish “adapter unit-tested” from “real delivery tested” and leave the corresponding verification gate open.

- [ ] **Step 4: Commit documentation**

Commit `docs: record auth and OTP integration evidence`. Do not push/deploy or mutate an unrelated cloud Supabase project.

## Self-review

- Spec coverage: PRD login methods, mandatory post-OAuth profile, unique phone, change-number semantics, action gate, precise-location privacy, service boundary, OTP proposal, failure/recovery copy, and no WhatsApp transactions all map to Tasks 1–4. Account recovery for lost/recycled numbers remains a product-policy item and is not exposed as an unsafe self-service endpoint.
- Placeholder scan: no implementation step delegates validation/error/security choices to the executor. Real boundary data and real provider delivery are explicit external verification gates, not fabricated substitutes.
- Type consistency: Edge responses and `OnboardingGateway` use `challengeId`, `deliveryStatus`, `expiresAt`, and `resendAt`; auth callback and action gate consume the same `OnboardingState.nextStep` values produced by database RPCs.
- Current blockers: Docker Engine is absent, no Barter cloud Supabase project has been designated, and no OpenWA test session/key/recipient is available. Safe code/test work proceeds, but those three integration claims remain open.
