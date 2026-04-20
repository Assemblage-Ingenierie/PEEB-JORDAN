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

**React 18 + Vite SPA** — no SSR, no router library. Navigation is state-driven via `AppContext.state.view`.

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
- **Thermal synergy:** Selecting insulation OR windows → HVAC capex −20%, HVAC savings +15%
- **Compound savings:** EE measures stack multiplicatively (diminishing returns model)
- **Funding tiers 0–4:** Energy gain % thresholds determine PEEB grant % of EE capex (0 %→80%)
- **Typology defaults:** `TYPOLOGY_DEFAULTS` provides baseline EUI and per-measure capex/savings by building type (School, Hospital, Office, Municipality, University)

### Database schema

**`buildings`** — one row per building. `measures` column is JSONB with **camelCase keys** (e.g., `savingsRate`, not `savings_rate`) to avoid JS mapping overhead. All other columns are snake_case.

**`app_params`** — singleton (id always = 1, enforced by `CHECK` constraint). Stores currency, energy cost, unit costs (JSONB), score config (JSONB), and savings-by-typology matrix (JSONB).

RLS is enabled on both tables with full `anon` access (single-org internal tool, no user auth).

### Draft lifecycle

New buildings start as `is_draft = true` with a `draft-{timestamp}` ID held only in memory. On `finalizeDraft`, the ID becomes a slug (e.g., `amman-school-1`) and the row is persisted to Supabase.

### Views (via `state.view`)

`dashboard` → `inventory` → `profile` → `new-building` → `map` → `parameters` → `calculator`

Navigation is done via `navigate(view)` and `selectBuilding(id)` from `useApp()`.

## Styling

Tailwind CSS with Assemblage Ingénierie brand tokens defined in both `tailwind.config.js` (as `ai-rouge`, `ai-violet`, etc.) and `src/index.css` (as CSS variables `--ai-rouge`, `--ai-violet`, etc.). Use the CSS variables in inline styles, Tailwind classes in JSX.

Shared utility classes (`.card`, `.btn-primary`, `.btn-secondary`, `.badge`, `.input`, `.label`, `.th`, `.td`) are defined in `src/index.css` under `@layer components`.

## Deployment

Deployed on Vercel. `vercel.json` rewrites all routes to `/index.html` for SPA navigation. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables.

Database migrations live in `supabase/migrations/`. Seed data in `supabase/seed.sql`.
