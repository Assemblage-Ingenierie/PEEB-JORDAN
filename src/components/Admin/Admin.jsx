import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Clock, Check, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = { viewer: 'Viewer', editor: 'Editor', admin: 'Administrator' };
const STATUS_ORDER  = ['viewer', 'editor', 'admin'];

export default function Admin() {
  const { profile: me } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');

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
        `Are you sure you want to grant administrator rights to: ${p.first_name || ''} ${p.last_name || ''}?`.replace(/\s+/g, ' ').trim()
      );
      if (!ok) return;
    }
    const { error } = await supabase.from('profiles').update({ status }).eq('id', p.id);
    if (error) setErr(error.message);
    else fetchProfiles();
  };

  const acceptRequest = async (p) => {
    setErr('');
    if (p.requested_status === 'admin') {
      const ok = window.confirm(
        `Are you sure you want to grant administrator rights to: ${p.first_name || ''} ${p.last_name || ''}?`.replace(/\s+/g, ' ').trim()
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
          <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>User account management</p>
        </div>
        <button onClick={fetchProfiles} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
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
            {requests.length} role request{requests.length > 1 ? 's' : ''}
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
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button onClick={() => rejectRequest(p)}
                    className="text-xs px-3 py-1 rounded-md"
                    style={{ background: 'white', color: 'var(--ai-rouge)', border: '1px solid var(--ai-rouge)', cursor: 'pointer' }}>
                    Reject
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
            {pending.length} account{pending.length > 1 ? 's' : ''} pending approval
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
                  <Check className="w-3.5 h-3.5" /> Approve
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
          Members ({approved.length})
        </h3>

        {loading && <p className="text-sm" style={{ color: 'var(--ai-noir70)' }}>Loading…</p>}

        {!loading && (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ai-violet)', color: 'white', fontSize: 11 }}>
                <th className="th" style={{ textAlign: 'left', color: 'white' }}>First name</th>
                <th className="th" style={{ textAlign: 'left', color: 'white' }}>Last name</th>
                <th className="th" style={{ textAlign: 'left', color: 'white' }}>Role</th>
                <th className="th" style={{ textAlign: 'left', color: 'white' }}>E-mail</th>
                <th className="th" style={{ textAlign: 'right', color: 'white' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {approved.length === 0 && (
                <tr><td className="td" colSpan={5} style={{ color: 'var(--ai-gris)' }}><em>No approved members.</em></td></tr>
              )}
              {approved.map(p => {
                const isMe = me?.id === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
                    <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>{p.first_name || '—'}</td>
                    <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>{p.last_name || '—'}</td>
                    <td className="td" style={{ color: 'var(--ai-noir70)' }}>{p.job_title || '—'}</td>
                    <td className="td" style={{ color: 'var(--ai-noir70)' }}>{p.email}</td>
                    <td className="td" style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        {isMe && <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>(you)</span>}
                        <select
                          value={p.status}
                          onChange={(e) => { if (e.target.value !== p.status) setStatus(p, e.target.value); }}
                          className="text-xs font-semibold rounded-md"
                          style={{
                            background: 'white', color: 'var(--ai-violet)',
                            border: '1px solid var(--ai-gris)', padding: '4px 8px', cursor: 'pointer',
                          }}
                        >
                          {STATUS_ORDER.map(s => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <button onClick={() => setApproval(p.id, false)}
                          className="text-xs px-2 py-1 rounded-md"
                          style={{ background: 'white', color: 'var(--ai-rouge)', border: '1px solid var(--ai-rouge)', cursor: 'pointer' }}>
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
