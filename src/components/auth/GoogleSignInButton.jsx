import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * "Sign in with Google" via Google Identity Services (GIS) + signInWithIdToken.
 *
 * Unlike supabase.auth.signInWithOAuth (which redirects through
 * <ref>.supabase.co and makes Google display that ugly domain on its consent
 * screen), this flow runs the Google sign-in entirely on OUR origin. Google
 * therefore shows the app's own domain (e.g. peeb-jordan.assemblage.net) and
 * returns an ID token that we exchange with Supabase — no paid custom-domain
 * add-on required.
 *
 * Requires VITE_GOOGLE_CLIENT_ID (the *Web* OAuth client id from Google Cloud
 * Console) and the current origin listed under that client's
 * "Authorized JavaScript origins".
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Supabase expects: hashed nonce sent to Google, raw nonce sent to signInWithIdToken.
async function makeNonce() {
  const raw = crypto.randomUUID() + crypto.randomUUID();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

export default function GoogleSignInButton({ onError, text = 'continue_with' }) {
  const divRef = useRef(null);
  const rawNonceRef = useRef('');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) { setUnavailable(true); return; }
    let cancelled = false;

    (async () => {
      try {
        await loadGis();
        const { raw, hashed } = await makeNonce();
        if (cancelled || !divRef.current) return;
        rawNonceRef.current = raw;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          callback: async (response) => {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce: rawNonceRef.current,
            });
            if (error) onError?.(error.message);
            // success → AuthContext's onAuthStateChange takes over
          },
        });

        window.google.accounts.id.renderButton(divRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,            // 'continue_with' | 'signin_with' | 'signup_with'
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(divRef.current.offsetWidth || 360, 400),
        });
      } catch {
        if (!cancelled) { setUnavailable(true); onError?.('Google sign-in failed to load.'); }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (unavailable) return null;

  return (
    <div ref={divRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', minHeight: 40 }} />
  );
}
