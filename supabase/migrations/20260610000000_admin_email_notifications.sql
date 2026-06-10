-- ============================================================
-- PEEB Med Jordan — Admin email notifications (via Brevo API)
-- Migration: 20260610000000_admin_email_notifications
-- ============================================================
-- Sends an English, brand-styled email to every admin when:
--   • a new user account is created, or
--   • a user requests an upgrade to editor/admin.
--
-- Uses pg_net to call Brevo's transactional API. The Brevo v3 API key is read
-- from Supabase Vault (secret name 'brevo_api_key') so it never lives in git.
-- If the key is missing or there are no admins, the call is skipped silently
-- (notifications are best-effort and never block signup / requests).
--
-- Sender address: change NOTIF_SENDER below if you want another @assemblage.net
-- address. The domain is already authenticated in Brevo.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── HTML helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.peeb_html_escape(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

CREATE OR REPLACE FUNCTION public.peeb_email_row(p_label text, p_value text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '<p style="margin:0 0 8px;"><strong style="color:#30323E;">' || p_label
      || ':</strong> ' || coalesce(nullif(p_value, ''), '—') || '</p>';
$$;

-- Branded shell (Assemblage colours, inline styles for email clients)
CREATE OR REPLACE FUNCTION public.peeb_email_shell(p_title text, p_body text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F2;margin:0;padding:32px 0;font-family:Open Sans,Segoe UI,Arial,sans-serif;"><tr><td align="center">'
 || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #DFE4E8;border-radius:12px;overflow:hidden;">'
 || '<tr><td style="background:#30323E;padding:20px 28px;"><span style="font-size:18px;font-weight:800;color:#ffffff;">PEEB Med Jordan</span></td></tr>'
 || '<tr><td style="padding:28px;font-size:14px;color:#4D4D4D;line-height:1.6;">'
 || '<h1 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#30323E;">' || p_title || '</h1>'
 || p_body
 || '</td></tr>'
 || '<tr><td style="background:#F2F2F2;padding:14px 28px;border-top:1px solid #DFE4E8;font-size:11px;color:#4D4D4D;">PEEB Med Jordan — automated notification</td></tr>'
 || '</table></td></tr></table>';
$$;

-- ── Core sender: email all admins via Brevo ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.peeb_notify_admins(p_subject text, p_html text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  NOTIF_SENDER constant text := 'noreply@assemblage.net';
  v_key        text;
  v_recipients jsonb;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'brevo_api_key' LIMIT 1;
  IF v_key IS NULL THEN RETURN; END IF;            -- key not configured yet

  SELECT jsonb_agg(jsonb_build_object('email', email))
  INTO v_recipients
  FROM public.profiles
  WHERE status = 'admin' AND is_approved = true AND email IS NOT NULL;
  IF v_recipients IS NULL THEN RETURN; END IF;     -- no admins to notify

  PERFORM net.http_post(
    url     := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', v_key, 'Content-Type', 'application/json', 'accept', 'application/json'),
    body    := jsonb_build_object(
                 'sender',      jsonb_build_object('email', NOTIF_SENDER, 'name', 'PEEB Med Jordan'),
                 'to',          v_recipients,
                 'subject',     p_subject,
                 'htmlContent', p_html
               )
  );
END;
$$;

-- ── Trigger: new user created ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.peeb_notify_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE body text;
BEGIN
  body :=
       public.peeb_email_row('Name',  public.peeb_html_escape(trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''))))
    || public.peeb_email_row('Email', public.peeb_html_escape(NEW.email))
    || public.peeb_email_row('Role (job title)', public.peeb_html_escape(NEW.job_title))
    || public.peeb_email_row('Status', initcap(NEW.status))
    || '<p style="margin:16px 0 0;font-size:13px;">Manage access on the Admin page of the application.</p>';
  PERFORM public.peeb_notify_admins('New user registered — PEEB Med Jordan',
                                    public.peeb_email_shell('New user registered', body));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_notify_new_user ON public.profiles;
CREATE TRIGGER profiles_notify_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.peeb_notify_new_user();

-- ── Trigger: role-upgrade request ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.peeb_notify_role_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE body text;
BEGIN
  body :=
       public.peeb_email_row('Name',  public.peeb_html_escape(trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''))))
    || public.peeb_email_row('Email', public.peeb_html_escape(NEW.email))
    || public.peeb_email_row('Current status',   initcap(NEW.status))
    || public.peeb_email_row('Requested status', initcap(NEW.requested_status))
    || '<p style="margin:16px 0 0;font-size:13px;">Review this request in the Admin page (Role requests).</p>';
  PERFORM public.peeb_notify_admins('Role upgrade request — PEEB Med Jordan',
                                    public.peeb_email_shell('Role upgrade request', body));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_notify_role_request ON public.profiles;
CREATE TRIGGER profiles_notify_role_request
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.requested_status IS NOT NULL AND NEW.requested_status IS DISTINCT FROM OLD.requested_status)
  EXECUTE FUNCTION public.peeb_notify_role_request();

-- ── Lock down: these are server-side only ───────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.peeb_notify_admins(text, text)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peeb_notify_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peeb_notify_role_request()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peeb_email_shell(text, text)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peeb_email_row(text, text)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peeb_html_escape(text)             FROM PUBLIC, anon, authenticated;
