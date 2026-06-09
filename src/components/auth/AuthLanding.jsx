import { useState } from 'react';
import { Mail, User, Briefcase, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PasswordInput from './PasswordInput';

// Assemblage brand colours (cf. src/index.css)
const VIOLET = 'var(--ai-violet)';
const ROUGE  = 'var(--ai-rouge)';
const GRIS   = 'var(--ai-gris)';
const NOIR70 = 'var(--ai-noir70)';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.52.09-1.03.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.52.9 3.59l2.63-2.07z"/>
      <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.9 4.47-3.9z"/>
    </svg>
  );
}

const isValidEmail = (e) => e.includes('@');

export default function AuthLanding() {
  // 'home' | 'signup' | 'login' | 'forgot'
  const [mode, setMode] = useState('home');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  // shared fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  // signup-only fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [jobTitle, setJobTitle]   = useState('');
  const [password2, setPassword2] = useState('');

  const emailInvalid = emailTouched && email.length > 0 && !isValidEmail(email);

  function reset(next) {
    setMsg(null); setLoading(false);
    setPassword(''); setPassword2(''); setEmailTouched(false);
    setMode(next);
  }

  async function handleGoogle() {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setMsg({ type: 'error', text: error.message }); setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setEmailTouched(true); return; }
    if (password.length < 6) { setMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    if (password !== password2) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, job_title: jobTitle },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) { setMsg({ type: 'error', text: error.message }); return; }
    setMsg({ type: 'success', text: 'Account created! Check your inbox to confirm your e-mail address, then sign in.' });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg({ type: 'error', text: error.message });
    // on success → onAuthStateChange (AuthContext) takes over
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setEmailTouched(true); return; }
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    setMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'If an account exists for this address, a recovery e-mail has just been sent.' });
  }

  // ── styles ──
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${GRIS}`, background: 'white', color: VIOLET,
    fontSize: 14, boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: VIOLET, marginBottom: 4, display: 'block' };
  const fieldIcon = { position: 'absolute', right: 10, top: 10, color: GRIS, pointerEvents: 'none' };

  function PrimaryBtn({ children, ...p }) {
    return (
      <button {...p} className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>
        {children}
      </button>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ai-gris-clair)', fontFamily: 'var(--ai-font)', padding: 24,
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 28 }}>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <img src="/logo_assemblage.png" alt="Assemblage ingénierie"
            style={{ height: 38, objectFit: 'contain', marginBottom: 12 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h1 style={{ fontSize: 18, fontWeight: 800, color: VIOLET, margin: 0 }}>PEEB Med Jordan</h1>
          <p style={{ fontSize: 12, color: NOIR70, marginTop: 4 }}>
            {mode === 'home'   && 'Programme management platform'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'login'  && 'Sign in'}
            {mode === 'forgot' && 'Password recovery'}
          </p>
        </div>

        {/* HOME — two buttons */}
        {mode === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PrimaryBtn onClick={() => reset('signup')}>Sign up</PrimaryBtn>
            <button onClick={() => reset('login')} className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}>Sign in</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
              <div style={{ flex: 1, height: 1, background: GRIS }} />
              <span style={{ fontSize: 11, color: NOIR70 }}>or</span>
              <div style={{ flex: 1, height: 1, background: GRIS }} />
            </div>
            <button onClick={handleGoogle} disabled={loading} className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
              <GoogleIcon /> Continue with Google
            </button>
          </div>
        )}

        {/* SIGNUP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First name</label>
                <div style={{ position: 'relative' }}>
                  <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <User className="w-4 h-4" style={fieldIcon} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last name</label>
                <div style={{ position: 'relative' }}>
                  <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} required />
                  <User className="w-4 h-4" style={fieldIcon} />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Role <span style={{ color: NOIR70, fontWeight: 400 }}>(your job title)</span></label>
              <div style={{ position: 'relative' }}>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56, paddingRight: 32 }}
                  value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Thermal engineer, project manager…" />
                <Briefcase className="w-4 h-4" style={fieldIcon} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <input type="email" style={{ ...inputStyle, borderColor: emailInvalid ? ROUGE : GRIS }}
                  value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)} required />
                <Mail className="w-4 h-4" style={fieldIcon} />
              </div>
              {emailInvalid && (
                <p style={{ color: ROUGE, fontSize: 12, marginTop: 4 }}>The e-mail address is not valid</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Password</label>
                <PasswordInput value={password} onChange={e => setPassword(e.target.value)} inputStyle={inputStyle} autoComplete="new-password" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Confirm</label>
                <PasswordInput value={password2} onChange={e => setPassword2(e.target.value)} inputStyle={inputStyle} autoComplete="new-password" required />
              </div>
            </div>

            <PrimaryBtn type="submit" disabled={loading}>{loading ? '…' : 'Create account'}</PrimaryBtn>
          </form>
        )}

        {/* LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} required />
                <Mail className="w-4 h-4" style={fieldIcon} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} inputStyle={inputStyle} autoComplete="current-password" required />
            </div>
            <PrimaryBtn type="submit" disabled={loading}>{loading ? '…' : 'Sign in'}</PrimaryBtn>
            <button type="button" onClick={() => reset('forgot')}
              style={{ background: 'none', border: 'none', color: ROUGE, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
              I forgot my password
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: GRIS }} />
              <span style={{ fontSize: 11, color: NOIR70 }}>or</span>
              <div style={{ flex: 1, height: 1, background: GRIS }} />
            </div>
            <button type="button" onClick={handleGoogle} disabled={loading} className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
              <GoogleIcon /> Continue with Google
            </button>
          </form>
        )}

        {/* FORGOT */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: NOIR70 }}>
              Enter your e-mail address to receive a password reset link.
            </p>
            <div>
              <label style={labelStyle}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <input type="email" style={{ ...inputStyle, borderColor: emailInvalid ? ROUGE : GRIS }}
                  value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)} required />
                <Mail className="w-4 h-4" style={fieldIcon} />
              </div>
              {emailInvalid && (
                <p style={{ color: ROUGE, fontSize: 12, marginTop: 4 }}>The e-mail address is not valid</p>
              )}
            </div>
            <PrimaryBtn type="submit" disabled={loading}>{loading ? '…' : 'Send a recovery e-mail'}</PrimaryBtn>
          </form>
        )}

        {/* message */}
        {msg && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, textAlign: 'center',
            background: msg.type === 'success' ? 'var(--ai-rouge-clair)' : '#fff0f0',
            border: `1px solid ${msg.type === 'success' ? ROUGE : '#ffc0c0'}`,
            color: VIOLET,
          }}>
            {msg.text}
          </div>
        )}

        {/* back */}
        {mode !== 'home' && (
          <button onClick={() => reset('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '18px auto 0', background: 'none', border: 'none', color: NOIR70, fontSize: 12, cursor: 'pointer' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
      </div>
    </div>
  );
}
