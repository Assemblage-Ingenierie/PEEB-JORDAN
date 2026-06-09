import { useState, useEffect, useCallback, Fragment } from 'react';
import { Shield, RefreshCw, Clock, Check, ChevronDown, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = { viewer: 'Lecteur', editor: 'Éditeur', admin: 'Administrateur' };
const STATUS_ORDER  = ['viewer', 'editor', 'admin'];

const STATUS_BADGE = {
  viewer: { bg: 'var(--ai-gris-clair)', color: 'var(--ai-violet)' },
  editor: { bg: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' },
  admin:  { bg: 'var(--ai-violet)',      color: 'white' },
};

export default function Admin() {
  const { profile: me } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [openId, setOpenId]     = useState(null); // row whose status panel is open

  const fetchProfiles = useCallback(async () => {
    setLoading(true); setErr('');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) setErr(error.message);
    else setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const setApproval = async (id, approved) => {
    setErr('');
    const { error } = await supabase.from('profiles').update({ is_approved: approved }).eq('id', id);
    if (error) setErr(error.message);
    else fetchProfiles();
  };

  const setStatus = async (p, status) => {
    setErr('');
    if (status === 'admin') {
      const ok = window.confirm(
        `Êtes-vous sûr de donner les droits administrateur à : ${p.first_name || ''} ${p.last_name || ''} ?`.replace(/\s+/g, ' ').trim()
      );
      if (!ok) return;
    }
    const { error } = await supabase.from('profiles').update({ status }).eq('id', p.id);
    if (error) setErr(error.message);
    else { setOpenId(null); fetchProfiles(); }
  };

  const acceptRequest = async (p) => {
    setErr('');
    if (p.requested_status === 'admin') {
      const ok = window.confirm(
        `Êtes-vous sûr de donner les droits administrateur à : ${p.first_name || ''} ${p.last_name || ''} ?`.replace(/\s+/g, ' ').trim()
      );
      if (!ok) return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ status: p.requested_status, requested_status: null })
      .eq('id', p.id);
    if (error) setErr(error.message);
    else fetchProfiles();
  };

  const rejectRequest = async (p) => {
    setErr('');
    const { error } = await supabase.from('profiles').update({ requested_status: null }).eq('id', p.id);
    if (error) setErr(error.message);
    else fetchProfiles();
  };

  const requests = profiles.filter(p => p.requested_status);
  const pending  = profiles.filter(p => !p.is_approved);
  const approved = profiles.filter(p => p.is_approved);

  const fullName = (p) => `${p.first_name || ''} ${p.last_name || ''}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--ai-violet)' }}>Admin</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>Gestion des comptes utilisateurs</p>
        </div>
        <button onClick={fetchProfiles} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Rafraîchir
        </button>
      </div>

      {err && (
        <div className="ai-box-soft text-sm" style={{ color: 'var(--ai-rouge)' }}>{err}</div>
      )}

      {/* ── Demandes de rôle ── */}
      {requests.length > 0 && (
        <section className="card">
          <h3 className="text-xs font-bold uppercase tracking-wide mb-4 pb-2 flex items-center gap-2"
            style={{ color: 'var(--ai-rouge)', borderBottom: '1px dashed var(--ai-rouge)' }}>
            <ArrowUpCircle className="w-4 h-4" />
            {requests.length} demande{requests.length > 1 ? 's' : ''} de rôle
          </h3>
          <div className="space-y-2">
            {requests.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg"
                style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--ai-violet)' }}>
                    {fullName(p) || p.email}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--ai-noir70)' }}>
                    {p.email} · {STATUS_LABELS[p.status]} → <strong style={{ color: 'var(--ai-rouge)' }}>{STATUS_LABELS[p.requested_status]}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => acceptRequest(p)} className="btn-primary text-xs">
                    <Check className="w-3.5 h-3.5" /> Accepter
                  </button>
                  <button onClick={() => rejectRequest(p)}
                    className="text-xs px-3 py-1 rounded-md"
                    style={{ background: 'white', color: 'var(--ai-rouge)', border: '1px solid var(--ai-rouge)', cursor: 'pointer' }}>
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Demandes en attente (comptes non approuvés / révoqués) ── */}
      {pending.length > 0 && (
        <section className="card">
          <h3 className="text-xs font-bold uppercase tracking-wide mb-4 pb-2 flex items-center gap-2"
            style={{ color: 'var(--ai-rouge)', borderBottom: '1px dashed var(--ai-rouge)' }}>
            <Clock className="w-4 h-4" />
            {pending.length} demande{pending.length > 1 ? 's' : ''} en attente d'approbation
          </h3>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg"
                style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--ai-violet)' }}>
                    {fullName(p) || p.email}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--ai-noir70)' }}>
                    {p.email}{p.job_title ? ` · ${p.job_title}` : ''}
                  </div>
                </div>
                <button onClick={() => setApproval(p.id, true)} className="btn-primary text-xs flex-shrink-0">
                  <Check className="w-3.5 h-3.5" /> Approuver
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Membres ── */}
      <section className="card">
        <h3 className="text-xs font-bold uppercase tracking-wide mb-4 pb-2 flex items-center gap-2"
          style={{ color: 'var(--ai-rouge)', borderBottom: '1px dashed var(--ai-rouge)' }}>
          <Shield className="w-4 h-4" />
          Membres ({approved.length})
        </h3>

        {loading && <p className="text-sm" style={{ color: 'var(--ai-noir70)' }}>Chargement…</p>}

        {!loading && (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ai-violet)', color: 'white', fontSize: 11 }}>
                <th className="th" style={{ textAlign: 'left' }}>Prénom</th>
                <th className="th" style={{ textAlign: 'left' }}>Nom</th>
                <th className="th" style={{ textAlign: 'left' }}>Rôle</th>
                <th className="th" style={{ textAlign: 'left' }}>E-mail</th>
                <th className="th" style={{ textAlign: 'right' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {approved.length === 0 && (
                <tr><td className="td" colSpan={5} style={{ color: 'var(--ai-gris)' }}><em>Aucun membre approuvé.</em></td></tr>
              )}
              {approved.map(p => {
                const badge = STATUS_BADGE[p.status] || STATUS_BADGE.viewer;
                const isOpen = openId === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
                      {/* Prénom & Nom — cliquables pour gérer le statut */}
                      <td className="td">
                        <button onClick={() => setOpenId(isOpen ? null : p.id)}
                          className="font-semibold flex items-center gap-1"
                          style={{ color: 'var(--ai-violet)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {p.first_name || '—'}
                        </button>
                      </td>
                      <td className="td">
                        <button onClick={() => setOpenId(isOpen ? null : p.id)}
                          className="font-semibold flex items-center gap-1"
                          style={{ color: 'var(--ai-violet)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {p.last_name || '—'}
                          <ChevronDown className="w-3 h-3" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                        </button>
                      </td>
                      <td className="td" style={{ color: 'var(--ai-noir70)' }}>{p.job_title || '—'}</td>
                      <td className="td" style={{ color: 'var(--ai-noir70)' }}>{p.email}</td>
                      <td className="td" style={{ textAlign: 'right' }}>
                        <span className="badge" style={{ background: badge.bg, color: badge.color }}>
                          {STATUS_LABELS[p.status] || p.status}
                          {me?.id === p.id ? ' (vous)' : ''}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: 'var(--ai-gris-clair)' }}>
                        <td className="td" colSpan={5}>
                          <div className="flex items-center gap-2 flex-wrap py-1">
                            <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
                              Statut de {fullName(p) || p.email} :
                            </span>
                            {STATUS_ORDER.map(s => (
                              <button key={s} onClick={() => setStatus(p, s)} disabled={p.status === s}
                                className="text-xs px-3 py-1 rounded-md font-semibold"
                                style={p.status === s
                                  ? { background: 'var(--ai-violet)', color: 'white', cursor: 'default' }
                                  : { background: 'white', color: 'var(--ai-violet)', border: '1px solid var(--ai-gris)', cursor: 'pointer' }}>
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                            <span style={{ flex: 1 }} />
                            <button onClick={() => setApproval(p.id, false)}
                              className="text-xs px-3 py-1 rounded-md"
                              style={{ background: 'white', color: 'var(--ai-rouge)', border: '1px solid var(--ai-rouge)', cursor: 'pointer' }}>
                              Révoquer l'accès
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
