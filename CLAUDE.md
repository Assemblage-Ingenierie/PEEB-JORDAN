# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test or lint scripts are configured.

## Environment

Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Architecture

**React 18 + Vite SPA** — no SSR, no router library. Navigation is state-driven via `AppContext.state.view`, with `src/lib/router.js` mapping `state.view (+ selectedId)` onto pretty URLs (`/`, `/buildings`, `/buildings/<id>`, `/new-building`, `/map`, `/parameters`, `/calculator`, `/admin`, `/guide`). The provider syncs view → `history.pushState` and listens to `popstate` so back/forward and middle-click "open in new tab" work natively. Vercel rewrites everything to `/index.html` (see `vercel.json`).

The whole app is gated by `AuthProvider` → `AuthGate` (see **Authentication** below); `AppProvider` and its data fetch only mount for an approved user.

### Data flow

```
Supabase (PostgreSQL)
  └── src/lib/db.js          ← CRUD + snake_case↔camelCase mapping
        └── src/context/AppContext.jsx  ← useReducer global state
              ├── src/engine/CalculationEngine.js  ← pure math (no side effects)
              └── src/components/**               ← UI reads useApp() hook
```

### State (AppContext)

Single `useReducer` store with shape `{ params, buildings[], selectedId, view, notification, loading }`.

All UI mutations go through actions dispatched to the reducer. Persistence is **optimistic and async**:
- Building changes: batched in a `pendingSaves` ref, flushed after each render cycle via `useEffect([state.buildings])`
- Params changes: debounced 800ms via `paramsSaveTimerRef`
- `stateRef` (always-fresh ref) prevents stale closures in async callbacks
- `initializedRef` gates writes so the initial DB load doesn't trigger saves

On first load with an empty DB, `INITIAL_BUILDINGS` from `src/data/sampleData.js` is auto-seeded.

### Calculation engine (`src/engine/CalculationEngine.js`)

Pure functions — no imports from React or Supabase. Key entry points:

- `calculateBuilding(building, params)` — returns energy gain, capex, PEEB grant, payback, CO2 savings
- `calculateScore(building, params, calcResult)` — 0–100 composite PEEB score
- `aggregateKPIs(buildings, params)` — portfolio-wide totals shown on Dashboard
- `detectDataGaps(building)` — lists missing required fields

**Critical domain rules:**
- **Energy gain resolution order** (in `calculateBuilding`):
  1. `building.gainOverride` (manual % set via the "Force value" checkbox in the Total Energy Saving block)
  2. Derived from `building.totalBaselineKwh` and `building.totalProjectKwh` → `(1 − project/baseline) × 100`
  3. Compound EE measures model: `1 − Π(1 − savingsRate)` over selected EE measures
- **Thermal synergy is disabled.** `applyThermalSynergy` is kept as a passthrough so existing call sites still work; do not reintroduce HVAC capex/savings adjustments.
- **No automatic savings defaults.** `makeDraft` starts every measure at `savingsRate: 0` and the engine no longer overrides per-typology rates from `params.savingsByTypology`. Capex defaults from `TYPOLOGY_DEFAULTS` still apply on draft creation.
- **Funding tiers 0–4:** Energy gain % thresholds determine PEEB grant % of EE capex (0 %→80%)
- **Typology defaults:** `TYPOLOGY_DEFAULTS` provides baseline EUI and per-measure **capex only** (savings columns remain in the constant for reference but are not applied)

### Database schema

**`buildings`** — one row per building. `measures` column is JSONB with **camelCase keys** (e.g., `savingsRate`, not `savings_rate`) to avoid JS mapping overhead. All other columns are snake_case.

Per-building scalar columns added on top of the initial schema:
- `total_baseline_kwh`, `total_project_kwh`, `gain_override` — drive the Total Energy Saving block
- `ee_capex_override` — manual override of the total EE capex
- `design_progress`, `works_progress` — nullable text, values `'ongoing' | 'completed' | null` (rendered as pastilles in the inventory, click to cycle)
- `existing_audit`, `audit_author`, `audit_date`, `audit_file_url` — audit metadata; `source` — provenance tag
Migrations live in `supabase/migrations/`; the camelCase/snake_case mapping is in `src/lib/db.js` (`dbToJs` / `jsToDB`).

**`app_params`** — singleton (id always = 1, enforced by `CHECK` constraint). Stores currency, exchange rate, energy cost, unit costs (JSONB), score config (JSONB), and `budget_config` (JSONB). The legacy `savings_by_typology` column still exists but is no longer read or written.

**`profiles`** — one row per `auth.users` account (see **Authentication**). Columns: `email`, `first_name`, `last_name`, `job_title` (free-text "métier"), `status` (`viewer | editor | admin`), `is_approved`, `requested_status` (`editor | admin | null` — a pending role-upgrade request), `created_at`.

RLS is enabled on all three tables. **Access is role-based, enforced server-side** (no more open `anon` access):
- `buildings` — SELECT for any approved user; INSERT/UPDATE/DELETE for `editor`/`admin` (`peeb_can_edit()`).
- `app_params` — SELECT for any approved user; write for `admin` only (`peeb_is_admin()`).
- `profiles` — a user reads their own row; only admins read all / update / delete. A `BEFORE` trigger blocks removing or demoting the last approved admin.

### Draft lifecycle

New buildings start as `is_draft = true` with a `draft-{timestamp}` ID held only in memory. On `finalizeDraft`, the ID becomes a slug (e.g., `amman-school-1`) and the row is persisted to Supabase.

### Authentication & roles

Supabase Auth (Google OAuth + email/password with email verification). `src/context/AuthContext.jsx`
holds the session + `profiles` row and exposes `authState` (`loading | loggedout | waiting | recovery | approved`),
`isAdmin`, `canEdit`. `src/components/auth/AuthGate.jsx` renders `AuthLanding` (S'inscrire / Se connecter / Google /
forgot-password), `WaitingScreen` (account pending admin approval), or `ResetPasswordScreen` accordingly.

**Authorisation model:** signups are open and land as an **approved `viewer`** (immediate read access) — a trigger on
`auth.users` (INSERT + UPDATE — the UPDATE covers Google OAuth's first sign-in) auto-creates the `profiles` row from
`raw_user_meta_data` with `status='viewer', is_approved=true`. To gain more rights a user **requests** an upgrade
(`RequestAccessModal` from the sidebar → sets `requested_status`); only an **admin** accepts (sets `status`) or rejects
(clears it) on the **Admin** page. Self-service writes to `profiles` are allowed for one's own row, but a `BEFORE UPDATE`
guard (`peeb_guard_self_update`) freezes `status`/`is_approved` for non-admins, so a request can never self-escalate.
The **Admin** page (`src/components/Admin/Admin.jsx`, admin-only) shows role requests, lists users, and changes a
user's `status` (click the first/last name) with a confirm dialog when promoting to admin.
> Note: auto-approval means anyone who can sign up (any Google account / email) gets viewer read access — restrict
> signups (e.g. domain allowlist) if the data must stay private.

Three tiers: **viewer** (read + filter), **editor** (edit building data), **admin** (+ Parameters + Admin page).
UI gating lives in `Sidebar` (hides Parameters/Admin), `AppContext` mutation choke-points (`canEdit`/`isAdmin`, with a
throttled "read-only" toast), and an `ActiveView` guard. **RLS is the real barrier** — the UI gating is convenience only.

The **first admin** must be seeded once after signing up:
`UPDATE public.profiles SET status='admin', is_approved=true WHERE email='…';`. Dashboard config (Google provider,
"Confirm email", redirect URLs, and a Brevo SMTP relay for reliable delivery) is done in the Supabase console.

### Views (via `state.view`)

`dashboard` → `inventory` → `profile` → `new-building` → `map` → `parameters` → `calculator` → `admin` → `guide`

Navigation is done via `navigate(view)` and `selectBuilding(id)` from `useApp()`. Both consult an optional **navigation guard** (`setNavigationGuard(fn)`) so screens can block leaving when there are unsaved changes — used by `BuildingProfile` to surface its Save / Discard / Stay modal. The `popstate` handler is also guard-aware and re-pushes the current URL if the guard denies.

### Inventory columns

`src/components/Buildings/BuildingInventory.jsx` groups columns into four vertical sections (`SECTION_DEFS`):

1. **Building Data** — id, PEEB badge, name, typology, governorate, region, area, floors, year built.
2. **Audit Data** — existing audit flag, author, audit date, EUI before/after/diff, **Gain %** (`calc` key).
3. **Progress** — `designProgress` and `worksProgress`. Each cell is a click-to-cycle pastille: `—` → Ongoing (yellow) → Completed (green) → `—`.
4. **Investment** — Existing Funding (first), priority, capex EE/GR/total, expected PEEB grant, savings/yr, score, and per-measure icons.

### Building profile — Save / Discard / leave guard

`BuildingProfile.jsx` snapshots the raw building on open (stripping the `calc/gaps/eligibility` enrichment), then watches for divergence on every render to set an `isDirty` flag.

- **Save changes** — re-snapshots the current state as the new baseline (changes auto-persist optimistically; "Save" is the user's checkpoint).
- **Discard** — dispatches `updateBuilding(id, snapshot)` to revert in-memory and DB state.
- Leaving the page while `isDirty` triggers a modal (Stay / Discard & leave / Save & leave) via the navigation guard; closing the tab is blocked with a native `beforeunload` warning.

## Styling

Tailwind CSS with Assemblage Ingénierie brand tokens defined in both `tailwind.config.js` (as `ai-rouge`, `ai-violet`, etc.) and `src/index.css` (as CSS variables `--ai-rouge`, `--ai-violet`, etc.). Use the CSS variables in inline styles, Tailwind classes in JSX.

Shared utility classes (`.card`, `.btn-primary`, `.btn-secondary`, `.badge`, `.input`, `.label`, `.th`, `.td`) are defined in `src/index.css` under `@layer components`.

## Deployment

Deployed on Vercel. `vercel.json` rewrites all routes to `/index.html` for SPA navigation. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables.

Database migrations live in `supabase/migrations/`. Seed data in `supabase/seed.sql`.
