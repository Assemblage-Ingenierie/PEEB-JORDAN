import { useState } from 'react';
import { User, Briefcase, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// Prefill names from Google metadata when available.
function guessNames(user) {
  const m = user?.user_metadata || {};
  let first = m.given_name || m.first_name || '';
  let last  = m.family_name || m.last_name || '';
  if (!first && !last && (m.full_name || m.name)) {
    const parts = String(m.full_name || m.name).trim().split(/\s+/);
    first = parts.shift() || '';
    last  = parts.join(' ');
  }
  return { first, last };
}

export default function CompleteProfileModal() {
  const { session, profile, refreshProfile, logout } = useAuth();
  const guessed = guessNames(session?.user);

  const [firstName, setFirstName] = useState(profile?.first_name || guessed.first || '');
  const [lastName, setLastName]   = useState(profile?.last_name  || guessed.last  || '');
  const [jobTitle, setJobTitle]   = useState(profile?.job_title  || '');
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !jobTitle.trim()) {
      setErr('Please fill in all fields.');
      return;
    }
    setLoading(true); setErr('');
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        job_title:  jobTitle.trim(),
      })
      .eq('id', session.user.id);
    if (error) { setErr(error.message); setLoading(false); return; }
    await refreshProfile();
    // refreshProfile re-renders AuthGate; the modal unmounts once the profile is complete.
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--ai-gris)', background: 'white', color: 'var(--ai-violet)',
    fontSize: 14, boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--ai-violet)', marginBottom: 4, display: 'block' };
  const fieldIcon = { position: 'absolute', right: 10, top: 10, color: 'var(--ai-gris)', pointerEvents: 'none' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ai-gris-clair)', fontFamily: 'var(--ai-font)', padding: 24,
    }}>
      <form onSubmit={handleSubmit} className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ai-violet)', margin: 0 }}>Complete your profile</h2>
          <p style={{ fontSize: 13, color: 'var(--ai-noir70)', marginTop: 6 }}>
            Fill in your details to finish setting up your account.
          </p>
          {session?.user?.email && (
            <p style={{ fontSize: 12, color: 'var(--ai-noir70)', marginTop: 2 }}>{session.user.email}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
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
            <label style={labelStyle}>Role <span style={{ color: 'var(--ai-noir70)', fontWeight: 400 }}>(your job title)</span></label>
            <div style={{ position: 'relative' }}>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56, paddingRight: 32 }}
                value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Thermal engineer, project manager…" />
              <Briefcase className="w-4 h-4" style={fieldIcon} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading ? '…' : 'Save'}
          </button>
        </div>

        {err && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13, textAlign: 'center',
            background: '#fff0f0', border: '1px solid #ffc0c0', color: 'var(--ai-violet)' }}>
            {err}
          </div>
        )}

        <button type="button" onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '16px auto 0', background: 'none', border: 'none', color: 'var(--ai-noir70)', fontSize: 12, cursor: 'pointer' }}>
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </form>
    </div>
  );
}
