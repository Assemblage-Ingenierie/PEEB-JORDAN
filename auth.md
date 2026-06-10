# Authentication & Authorisation — PEEB Med Jordan

This document summarises the authentication / authorisation layer added to the app
(branch `MBA-Auth`). It is a single-organisation internal tool: a React + Vite SPA on
Vercel, backed by the Supabase project **External** (`grnkbnldfzdzrgleorra`).

## Overview

- **Providers:** Google OAuth + email/password (with email verification) + password reset.
- **Three permission tiers** (`profiles.status`): `viewer` (read + filter), `editor`
  (edit building data), `admin` (+ Parameters + Admin page).
- **Authorisation model:** any new account is **immediately an approved `viewer`**. To get
  more rights, a user **requests** an upgrade (`requested_status`); only an **admin**
  accepts (sets `status`) or rejects (clears the request).
- **The real barrier is server-side RLS.** UI gating (hidden buttons, read-only mode) is
  convenience only — every write is enforced by Postgres Row-Level-Security.

## Data model — `public.profiles`

One row per `auth.users` account.

| column | meaning |
|---|---|
| `id` (uuid, PK → `auth.users`) | account link (cascade delete) |
| `email` | copy for the admin list |
| `first_name`, `last_name` | names |
| `job_title` | free-text "Role / métier" — informational, **not** a permission |
| `status` (`viewer`/`editor`/`admin`) | permission tier |
| `is_approved` (bool, default `true`) | access gate (kept for ban/revoke) |
| `requested_status` (`editor`/`admin`/null) | pending role-upgrade request |
| `created_at` | tri |

A trigger on `auth.users` (INSERT **and** UPDATE — the UPDATE covers Google OAuth's first
sign-in) auto-creates the profile from `raw_user_meta_data` as an approved viewer.

## Security (RLS) — the enforced rules

Migrations live in `supabase/migrations/2026060900000{0..4}_*.sql`.

- **`buildings`** — SELECT: any approved user; INSERT/UPDATE/DELETE: `editor`/`admin`
  (`peeb_can_edit()`).
- **`app_params`** — SELECT: any approved user; write: `admin` only (`peeb_is_admin()`).
- **`profiles`** — read own row (admins read all); a user may update their **own** row, but a
  `BEFORE UPDATE` guard (`peeb_guard_self_update`) **freezes `status`/`is_approved` for
  non-admins**, so self-service profile completion and role requests can never escalate.
- **Anti-lockout:** a trigger refuses to remove/demote the last approved admin.
- Helper functions are `SECURITY DEFINER` (avoids RLS recursion); EXECUTE is revoked from
  `anon`/`public` and trigger functions from everyone.
- The original open `anon` full-access policies were **removed** — that was the pre-auth hole
  (anyone with the URL could read/write the whole DB via the REST API).

## Frontend

Mounted as `AuthProvider → AuthGate → AppProvider → Shell` (`src/App.jsx`), so the data layer
only loads for an approved user.

- `src/context/AuthContext.jsx` — session + profile; `authState`
  (`loading | loggedout | waiting | recovery | approved`); exposes `isAdmin`, `canEdit`,
  `logout`, `refreshProfile`; handles the `PASSWORD_RECOVERY` event.
- `src/components/auth/`
  - `AuthGate.jsx` — routes to the right screen.
  - `AuthLanding.jsx` — Sign up / Sign in / Continue with Google / forgot-password.
  - `PasswordInput.jsx` — password field with a show/hide (eye) toggle.
  - `WaitingScreen.jsx` — account pending approval.
  - `ResetPasswordScreen.jsx` — set a new password (recovery flow).
  - `CompleteProfileModal.jsx` — collects first/last name + job title when missing
    (typical for Google sign-ups); prefilled from Google metadata.
  - `RequestAccessModal.jsx` — request Editor/Administrator (rendered in a portal so it sits
    above the Leaflet map).
- Role gating: `Sidebar` hides Parameters/Admin for non-admins (+ user footer & sign-out and a
  "Request access" button); `AppContext` mutation choke-points no-op + toast for non-editors
  (params for non-admins), with a throttled toast; an `ActiveView` guard blocks admin views by
  URL; `BuildingProfile` shows a read-only banner and hides Save/Discard/Delete for viewers.
- `Admin.jsx` (admin-only) — role requests (accept/reject), pending approvals, member list
  (First name · Last name · Role · E-mail · Status); click a name to change status, with a
  confirm dialog when promoting to admin.

## Configuration (Supabase / Brevo / Google)

- **Env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Vercel: set for Preview + Production).
- **Google OAuth:** dedicated Google Cloud OAuth client; authorised redirect URI is the
  Supabase callback `https://grnkbnldfzdzrgleorra.supabase.co/auth/v1/callback`.
- **URL configuration (Supabase):** Site URL = production domain; Redirect allowlist includes
  `http://localhost:5173/**` and `https://*.vercel.app/**` (tighten to the exact prod domain
  later).
- **Emails:** custom SMTP via **Brevo** (`smtp-relay.brevo.com:587`), domain `assemblage.net`
  authenticated (SPF/DKIM via IONOS), sender `malo@assemblage.net`. Templates (Confirm signup,
  Reset password, Invite, Reauthentication) are branded in Assemblage colours.
- **First admin** was seeded once:
  `UPDATE public.profiles SET status='admin', is_approved=true WHERE email='malo@assemblage.net';`
- **Admin email notifications** (`supabase/migrations/20260610000000_admin_email_notifications.sql`):
  Postgres triggers on `profiles` call Brevo's transactional API (via `pg_net`) to email every
  admin when a new user signs up and when a role upgrade is requested. The Brevo **v3 API key**
  is stored in **Supabase Vault** as `brevo_api_key`; the sender is `noreply@assemblage.net`
  (edit `NOTIF_SENDER` in the migration to change it). Best-effort: skipped silently if the key
  is absent or there are no admins.

## Known follow-ups

- **Open registration:** auto-approval + open Google OAuth means anyone who can sign up gets
  viewer read access. Restrict signups (e.g. `@assemblage.net` domain allowlist) if the data
  must stay private.
- Tighten the Vercel redirect wildcard to the exact production domain.
- Optionally enable Supabase "Leaked password protection".
