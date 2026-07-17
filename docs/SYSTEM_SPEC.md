# find-my-nailist — System Spec

A standalone reference for this project: what it is, how it's built, and the
non-obvious decisions behind it. Written so a fresh AI session (or a new
developer) can get oriented without re-deriving everything from scratch.

## What this is

**נייליסטיות** (nailistiot.fun) — an Israeli two-sided marketplace connecting
clients with independent nail technicians ("nailists"). Clients search by
city/location and service type, view portfolios and reviews, and book
appointments directly. Nailists get a free public profile, manage their own
services/hours/portfolio, and handle incoming bookings from a dashboard.
Hebrew-first (RTL), fully bilingual-capable UI copy in Hebrew only today.

## Tech stack

- **Next.js 16 (App Router, Turbopack)**, React 19, TypeScript, standalone
  output (Docker-deployed, not Vercel).
- **Tailwind CSS v4** — CSS-variable-based theme (`@theme inline` in
  `globals.css`), not the old `tailwind.config.js` approach. Light/dark mode
  via a `.dark` class on `<html>`, toggled client-side and persisted to
  `localStorage`.
- **Firebase**: Firestore (data), Firebase Auth (client SDK — session state
  lives in IndexedDB, not cookies), Firebase Storage (photos), `firebase-admin`
  server-side for all API routes.
- **Framer Motion** for animation (scroll parallax, tilt cards, reveal
  transitions) — see Design system section.
- **react-hook-form + zod** for all forms and API request validation.
- **@tanstack/react-query** for client-side data fetching/caching.
- **Resend** for transactional email (verification, booking notifications,
  password reset).
- **Google Maps** (`@vis.gl/react-google-maps`) for address autocomplete;
  **geofire-common** for geohash-based proximity search in Firestore.
- **Sentry** for error tracking, source maps uploaded at Docker build time.
- **Jest + @testing-library/react** for unit/component tests; **Playwright**
  for e2e (`e2e/*.spec.ts`).
- **Railway** for hosting, Dockerfile-based build. Deploys to production
  **only on git tag push** (`v*` tags) — a plain push to `main` does NOT
  update production. `NEXT_PUBLIC_APP_VERSION` (shown in the footer) is baked
  in at build time from `package.json`, so the version must be bumped in
  `package.json` before tagging or the footer lies.

## Auth & roles

Three roles: `CLIENT`, `NAILIST`, `ADMIN` (`UserDoc.role`). `isAdmin` is a
separate boolean flag, not a 4th role value — admin checks should verify both
where relevant (this was a real bug fixed earlier in the project's history:
`/api/me/role` used to hardcode admin by email).

- Firebase Auth handles credential/Google sign-in client-side; on success the
  client calls `/api/auth/session` which mints an `httpOnly`, `secure`,
  `sameSite=lax` cookie (`auth-token`, 14-day expiry) — this cookie, not
  Firebase's own session, is what `middleware.ts` and every API route check.
- `middleware.ts` protects `/dashboard`, `/my-appointments`, `/admin` by
  presence of the cookie only (not role) — role-specific gating happens
  client-side.
- `OnboardingGuard` (mounted globally in `providers.tsx`) redirects any
  logged-in user whose `onboardingCompleted` is not `true` to
  `/onboarding` (nailist) or `/onboarding/client`, UNLESS they're already on
  an allowed prefix (`/onboarding`, `/login`, `/terms`, `/privacy`,
  `/accessibility`, `/how-it-works`). Missing `onboardingCompleted` means
  "not done" (falsy-default), which is the OPPOSITE polarity convention from
  some other optional flags in this codebase — don't assume a missing field
  always means "false"/"safe".
- Email verification is enforced softly: unverified users see a banner
  (`EmailVerificationBanner`), not a hard block.
- A `suspended` flag on `UserDoc` blocks sign-in/session refresh without
  deleting the account.

## Onboarding

Nailist onboarding is a multi-step wizard (`src/app/onboarding/page.tsx`,
`STEPS` array) ending at working hours: business info → location → services
→ portfolio → working hours. Saving working hours currently flips
`isActive: true, onboardingCompleted: true` directly. **Note**: there is an
unimplemented plan (see `Pending work` below) to insert a paid-subscription
step before this final flip — if that ships, the completion trigger moves
from "working hours saved" to "payment confirmed".

Client onboarding (`/onboarding/client`) is a single short profile form.

## Core data model (Firestore, see `src/types/index.ts`)

Flat, denormalized-where-it-matters style — no nested subcollections for the
core entities. Each `*Doc` type is the raw Firestore shape (Timestamps);
the client-facing serialized type (no `Doc` suffix) converts Timestamps to
ISO strings and adds `id`.

- **`UserDoc`** — `uid`, `email`, `role`, `isAdmin?`, `suspended?`.
- **`NailistProfileDoc`** — business info, address + `latitude/longitude/geohash`
  for proximity search, `isActive` (public visibility toggle, also settable by
  the nailist herself), `isVerified` (admin-only badge), `onboardingCompleted`,
  optional Bit deposit fields (`depositEnabled`, `depositPercentage`,
  `bitPhone` — see Deposits below), optional social links.
- **`ClientProfileDoc`** — lighter: contact + location only.
- **`ServiceDoc`** — belongs to a nailist, `price`/`currency`/`durationMinutes`.
- **`PortfolioPhotoDoc`** — capped at 20 photos per nailist (enforced client
  + server side).
- **`WorkingHoursDoc`** — one doc per day-of-week (0=Sunday..6=Saturday) per
  nailist, `isActive` per day.
- **`AppointmentDoc`** — the booking record. Snapshots `price`, `currency`,
  `serviceName`, `nailistBusinessName`, `clientDisplayName` at booking time
  (never re-reads the live service/profile later) so historical bookings
  don't silently change if a nailist edits her prices afterward. Same
  snapshot pattern extended to deposit fields (see below).
  `status: AppointmentStatus` (`PENDING → CONFIRMED|CANCELLED`,
  `CONFIRMED → CANCELLED|COMPLETED|NO_SHOW`) is a strict whitelist enforced
  in `/api/appointments/[id]/status`. `GET /api/appointments` also does two
  **lazy** background transitions on read: auto-complete appointments past
  `endTime`, auto-cancel stale `PENDING` ones.
- **`ReviewDoc`** — one per completed appointment, `clientDisplayName`
  resolved live from the client's current profile at read time (not frozen),
  unlike the appointment snapshot fields.
- **`AuditLogDoc`** — append-only trail for admin mutations (role changes,
  suspensions, deletes, verified/active toggles).

## Deposits (Bit)

An opt-in feature: a nailist can require a small deposit via Bit (an
Israeli P2P payment app with **no merchant/webhook API** — this is a
manual, trust-based tracking layer, not a real payment gateway
integration). `depositEnabled` + `depositPercentage` (of service price) +
`bitPhone` live on `NailistProfileDoc`. At booking time, the percentage is
computed server-side into a frozen `depositAmount` on the `AppointmentDoc`.
`DepositStatus` (`AWAITING_PAYMENT → CLIENT_MARKED_PAID → NAILIST_CONFIRMED`)
is a **deliberately separate state machine** from `AppointmentStatus` — it
never gates or blocks the real confirm/cancel/complete flow, since Bit
payments can't be verified programmatically. `PATCH /api/appointments/[id]/deposit`
handles the transitions; either the client (`MARK_PAID`) or the nailist
(`CONFIRM_RECEIVED`, which she can do even without the client's claim first
— her word is authoritative since there's no verification).

## Admin surface

`/admin/*` — users (search/filter/bulk suspend/role-change), nailists
(verify/activate toggles), reviews (moderation/delete), appointments
(oversight), audit log (read-only trail of the above), analytics (search
query stats, daily snapshots). All mutations write an `AuditLogDoc`.

## Search & discovery

`/search` — the main browse surface: city/business-name text search,
category-pill filtering, "near me" geolocation search via `geofire-common`
geohash queries against `NailistProfileDoc.geohash`. `/cities/[city]` are
SEO landing pages for specific cities (statically generated,
`generateStaticParams`), separate from the interactive search page.

## Design system

- Brand colors already match a "beauty marketplace" palette: primary pink
  `#EC4899`, accent violet `#8B5CF6`, warm-pink background `#FDF2F8` (light)
  / near-black `#100910` (dark) — defined as CSS custom properties in
  `globals.css`, mapped into Tailwind's `@theme inline`.
- Heebo is the body/UI font (`next/font/google`, Hebrew + Latin subsets). An
  earlier attempt to add Frank Ruhl Libre as a serif display font for
  headings was tried and then **reverted** — headings use Heebo
  `font-black`, not a second font.
- `TiltCard` (`src/components/ui/tilt-card.tsx`) is a reusable mouse-tracked
  3D-tilt wrapper (CSS `perspective`/`rotateX`/`rotateY` via Framer Motion,
  not WebGL/Three.js — deliberately, for performance/accessibility) used on
  card grids. Always give both the TiltCard AND its parent grid-item
  `h-full` when cards sit in a grid row together, or unequal content length
  makes cards render at different heights (grid stretch alone doesn't
  propagate through a non-grid child).
- Scroll-linked parallax (`useScroll` + `useTransform`) is applied only to
  decorative/background layers, never text or interactive controls.
- `jest.setup.ts` carries a hand-rolled global mock of `framer-motion`
  (motion.* → plain DOM elements, hooks stubbed) — any new Framer Motion
  hook used in a component must be added to this mock or every test
  importing that component breaks.
- Reusable utility classes worth knowing: `.glass` / `.glass-dark`
  (frosted-panel effect), `.gradient-text`, `.bg-mesh`, `.pulse-glow`,
  `.dot-pattern`, `.float` — defined in `globals.css`, not Tailwind plugins.

## Known platform quirks (not bugs)

- **Turbopack cold start**: the first few requests to a route during dev
  server startup can 404 before the route finishes compiling, instead of
  blocking until ready. Resolves itself after the first "✓ Compiled" line.
- **iOS Safari address-bar autocomplete**: Safari's condensed URL bar always
  shows just the bare domain even when the loaded page is deeper
  (`/search`), and its "frequently visited" suggestion can autocomplete a
  typed domain straight to whatever subpage you visit most on your own
  device — this is per-device browsing history, not a site redirect.
- **Railway build secrets**: Railway's Dockerfile builder has no support for
  BuildKit `--mount=type=secret`; build-time secrets (e.g. `SENTRY_AUTH_TOKEN`
  for source-map upload) can only be passed as `ARG`/`ENV`, which Docker's own
  linter flags as bad practice. Accepted tradeoff given the platform
  constraint — mitigate by scoping that token narrowly in Sentry, not by
  fighting the Dockerfile.

## Testing conventions

- Every feature needs unit tests; run the full suite (`npm test`) before
  considering any change done.
- Test files live in `__tests__/` directories next to (or near) the code
  they cover, matching existing sibling tests' structure.
- Jest + RTL for anything React; plain Jest for pure API/utility logic.
- Playwright e2e specs (`e2e/*.spec.ts`) cover full user flows (booking,
  home page smoke tests) — slower, run separately from the unit suite.

## Release flow

1. Bump `"version"` in `package.json` to match the intended tag.
2. Commit and push to `main`.
3. Create and push a `v<version>` git tag — this is what actually triggers
   the Railway production deploy (a plain `main` push does not).

## Pending / planned work (not yet implemented)

- **Nailist subscription billing**: a plan exists (not built) to charge
  nailists a recurring monthly fee via Cardcom (chosen for combined
  recurring-billing + Israeli tax-invoice generation), gating search
  visibility after a grace period. Would add a `subscriptionStatus` field to
  `NailistProfileDoc` and a `BillingGuard` mirroring `OnboardingGuard`'s
  pattern. Full design exists in a saved plan file, not summarized here since
  none of it is built yet.
