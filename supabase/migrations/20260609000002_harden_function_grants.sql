-- ============================================================
-- PEEB Med Jordan — Harden SECURITY DEFINER function grants
-- Migration: 20260609000002_harden_function_grants
-- ============================================================
-- The security advisor flagged that our SECURITY DEFINER functions were
-- exposed as PostgREST RPC endpoints to anon/authenticated.
--
--   • Trigger functions (peeb_handle_new_user, peeb_protect_last_admin) are only
--     ever invoked by the trigger mechanism (which runs as table owner), so no
--     client role needs EXECUTE — revoke from everyone.
--   • Permission helpers (peeb_is_approved/can_edit/is_admin) MUST stay executable
--     by `authenticated` because RLS policies reference them; revoke from anon and
--     PUBLIC to remove the public RPC surface. They only ever reveal the *caller's
--     own* permission booleans, so the residual `authenticated` exposure is benign.
-- ============================================================

-- Trigger functions — callable by no client role
REVOKE EXECUTE ON FUNCTION public.peeb_handle_new_user()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peeb_protect_last_admin() FROM PUBLIC, anon, authenticated;

-- Permission helpers — only `authenticated` (needed by RLS policy evaluation)
REVOKE EXECUTE ON FUNCTION public.peeb_is_approved() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.peeb_can_edit()    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.peeb_is_admin()    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.peeb_is_approved() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.peeb_can_edit()    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.peeb_is_admin()    TO authenticated;

-- Pre-existing helper from the initial schema: pin its search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Pre-existing event-trigger function (auto-enables RLS on new public tables).
-- It is invoked by the event-trigger mechanism, never by clients — revoke EXECUTE.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
