import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Authentication & authorisation layer.
 *
 * authState:
 *   'loading'   — initial session check in flight
 *   'loggedout' — no session → AuthLanding
 *   'waiting'   — signed in but profile.is_approved === false → WaitingScreen
 *   'recovery'  — password-recovery link opened → ResetPasswordScreen
 *   'approved'  — signed in & approved → the app
 *
 * Permission tiers come from profiles.status (viewer | editor | admin):
 *   canEdit  = editor or admin
 *   isAdmin  = admin
 */

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[auth] fetchProfile:', error.code, error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState('loading');
  const [session, setSession]     = useState(null);
  const [profile, setProfile]     = useState(null);
  const [recovery, setRecovery]   = useState(false);
  const recoveryRef = useRef(false);
  const markRecovery = useCallback((v) => { recoveryRef.current = v; setRecovery(v); }, []);

  const applySession = useCallback(async (s) => {
    if (!s) {
      setSession(null);
      setProfile(null);
      setAuthState('loggedout');
      return;
    }
    setSession(s);
    const prof = await fetchProfile(s.user.id);
    setProfile(prof);
    setAuthState(prof?.is_approved ? 'approved' : 'waiting');
  }, []);

  useEffect(() => {
    let active = true;

    // Listener first so we catch PASSWORD_RECOVERY / token refreshes
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {
        markRecovery(true);
        setSession(s ?? null);
        setAuthState('recovery');
        return;
      }
      if (event === 'SIGNED_OUT') {
        markRecovery(false);
        applySession(null);
        return;
      }
      if (recoveryRef.current) return; // stay on reset screen until the user finishes
      applySession(s ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (active && !recoveryRef.current) applySession(data.session ?? null);
    });

    return () => { active = false; listener?.subscription?.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySession, markRecovery]);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    const prof = await fetchProfile(uid);
    setProfile(prof);
    setAuthState(prof?.is_approved ? 'approved' : 'waiting');
  }, [session]);

  const finishRecovery = useCallback(async () => {
    markRecovery(false);
    const { data } = await supabase.auth.getSession();
    await applySession(data.session ?? null);
  }, [applySession, markRecovery]);

  const logout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    markRecovery(false);
    setSession(null);
    setProfile(null);
    setAuthState('loggedout');
  }, []);

  const status  = profile?.status ?? 'viewer';
  const isAdmin = profile?.is_approved === true && status === 'admin';
  const canEdit = profile?.is_approved === true && (status === 'editor' || status === 'admin');

  return (
    <AuthContext.Provider value={{
      authState, session, profile, status, isAdmin, canEdit,
      logout, refreshProfile, finishRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
