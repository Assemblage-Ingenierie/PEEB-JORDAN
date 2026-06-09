import { useState } from 'react';
import { X, ShieldCheck, PencilLine, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const LABELS = { viewer: 'Lecteur', editor: 'Éditeur', admin: 'Administrateur' };

export default function RequestAccessModal({ onClose }) {
  const { profile, session, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const status    = profile?.status ?? 'viewer';
  const requested = profile?.requested_status ?? null;

  async function setRequest(tier) {
    setLoading(true); setErr('');
    const { error } = await supabase
      .from('profiles')
      .update({ requested_status: tier })
      .eq('id', session.user.id);
    setLoading(false);
    if (error) { setErr(error.message); return; }
    await refreshProfile();
  }

  // Tiers the user can request (only higher than current)
  const canRequestEditor = status === 'viewer';
  const canRequestAdmin  = status === 'viewer' || status === 'editor';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(48,50,62,.55)', fontFamily: 'var(--ai-font)', padding: 24,
    }} onClick={onClose}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-violet)', margin: 0 }}>Demander un accès</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ai-noir70)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ai-noir70)', margin: '0 0 16px' }}>
          Votre statut actuel : <strong style={{ color: 'var(--ai-violet)' }}>{LABELS[status]}</strong>.
          Une demande doit être validée par un administrateur.
        </p>

        {requested ? (
          <div className="space-y-3">
            <div className="ai-box-soft flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
              <span>Demande en cours : passage <strong>{LABELS[requested]}</strong> — en attente de validation.</span>
            </div>
            <button onClick={() => setRequest(null)} disabled={loading} className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}>
              Annuler la demande
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {canRequestEditor && (
              <button onClick={() => setRequest('editor')} disabled={loading} className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}>
                <PencilLine className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
                Demander le statut Éditeur
              </button>
            )}
            {canRequestAdmin && (
              <button onClick={() => setRequest('admin')} disabled={loading} className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}>
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
                Demander le statut Administrateur
              </button>
            )}
            {!canRequestEditor && !canRequestAdmin && (
              <p style={{ fontSize: 13, color: 'var(--ai-noir70)' }}>Vous disposez déjà du niveau d'accès maximal.</p>
            )}
          </div>
        )}

        {err && <p style={{ color: 'var(--ai-rouge)', fontSize: 12, marginTop: 12 }}>{err}</p>}
      </div>
    </div>
  );
}
