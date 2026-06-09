import { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword]   = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setMsg({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères.' }); return; }
    if (password !== password2) { setMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return; }
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setMsg({ type: 'error', text: error.message }); return; }
    setMsg({ type: 'success', text: 'Mot de passe mis à jour.' });
    setTimeout(() => onDone?.(), 1200);
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--ai-gris)', background: 'white', color: 'var(--ai-violet)',
    fontSize: 14, boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ai-gris-clair)', fontFamily: 'var(--ai-font)', padding: 24,
    }}>
      <form onSubmit={handleSubmit} className="card fade-in" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ai-rouge-clair)',
          }}>
            <Lock className="w-5 h-5" style={{ color: 'var(--ai-rouge)' }} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ai-violet)', margin: 0 }}>
            Nouveau mot de passe
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="password" style={inputStyle} placeholder="Nouveau mot de passe"
            value={password} onChange={e => setPassword(e.target.value)} required />
          <input type="password" style={inputStyle} placeholder="Confirmer le mot de passe"
            value={password2} onChange={e => setPassword2(e.target.value)} required />
          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading ? '…' : 'Mettre à jour'}
          </button>
        </div>

        {msg && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, textAlign: 'center',
            background: msg.type === 'success' ? 'var(--ai-rouge-clair)' : '#fff0f0',
            border: `1px solid ${msg.type === 'success' ? 'var(--ai-rouge)' : '#ffc0c0'}`,
            color: 'var(--ai-violet)',
          }}>
            {msg.text}
          </div>
        )}
      </form>
    </div>
  );
}
