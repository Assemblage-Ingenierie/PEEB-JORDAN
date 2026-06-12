import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, User, ArrowUpCircle, PencilLine, ShieldCheck, Clock, Save, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = { viewer: 'Viewer', editor: 'Editor', admin: 'Administrator' };

export default function MyAccountModal({ onClose }) {
  const { profile, session, refreshProfile } = useAuth();

  const status = profile?.status ?? 'viewer';

  // Initial snapshot used both to seed the form and to detect unsaved edits.
  const initial = useMemo(() => ({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    job_title: profile?.job_title || '',
    requested_status: profile?.requested_status ?? null,
  }), [profile]);

  const [form, setForm] = useState(initial);
  const [section, setSection] = useState('info'); // 'info' | 'requests'
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const isDirty =
    form.first_name !== initial.first_name ||
    form.last_name !== initial.last_name ||
    form.job_title !== initial.job_title ||
    form.requested_status !== initial.requested_status;

  const set = (k) => (e) => { setSaved(false); setForm(f => ({ ...f, [k]: e.target.value })); };

  async function save() {
    setSaving(true); setErr(''); setSaved(false);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        job_title: form.job_title.trim(),
        requested_status: form.requested_status,
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) { setErr(error.message); return false; }
    await refreshProfile();
    setSaved(true);
    return true;
  }

  function requestClose() {
    if (isDirty) { setShowLeave(true); return; }
    onClose();
  }

  async function saveAndExit() {
    const ok = await save();
    if (ok) onClose();
  }

  // Tiers the user can request (only higher than current status)
  const canRequestEditor = status === 'viewer';
  const canRequestAdmin  = status === 'viewer' || status === 'editor';

  return createPortal((
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(48,50,62,.55)', fontFamily: 'var(--ai-font)', padding: 24,
    }} onClick={requestClose}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 720, padding: 0, overflow: 'hidden', display: 'flex', minHeight: 460 }}
        onClick={e => e.stopPropagation()}>

        {/* ── Left menu ── */}
        <aside style={{ width: 200, flexShrink: 0, background: 'var(--ai-gris-clair)', borderRight: '1px solid var(--ai-gris)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ai-violet)', margin: '0 0 12px', padding: '0 8px' }}>My account</h2>
          {[
            { id: 'info', label: 'My informations', Icon: User },
            { id: 'requests', label: 'My requests', Icon: ArrowUpCircle },
          ].map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button key={id} onClick={() => setSection(id)}
                className="flex items-center gap-2 text-sm font-medium rounded-lg transition-all"
                style={{
                  padding: '8px 10px', textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer',
                  background: active ? 'white' : 'transparent',
                  color: active ? 'var(--ai-violet)' : 'var(--ai-noir70)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? 'var(--ai-rouge)' : 'var(--ai-gris)' }} />
                {label}
              </button>
            );
          })}
        </aside>

        {/* ── Right content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, minWidth: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ai-violet)', margin: 0 }}>
              {section === 'info' ? 'My informations' : 'My requests'}
            </h3>
            <button onClick={requestClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ai-noir70)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {section === 'info' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First name</label>
                    <input className="input" value={form.first_name} onChange={set('first_name')} />
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input className="input" value={form.last_name} onChange={set('last_name')} />
                  </div>
                </div>
                <div>
                  <label className="label">Role</label>
                  <input className="input" value={form.job_title} onChange={set('job_title')} placeholder="e.g. Energy engineer" />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input className="input" value={profile?.email || ''} readOnly
                    style={{ background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <input className="input" value={STATUS_LABELS[status] || status} readOnly
                    style={{ background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)', cursor: 'not-allowed' }} />
                  <button onClick={() => setSection('requests')}
                    className="mt-1.5 text-xs font-medium"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ai-rouge)', padding: 0, textDecoration: 'underline' }}>
                    Make a request to update status
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p style={{ fontSize: 13, color: 'var(--ai-noir70)', margin: 0 }}>
                  Your current status: <strong style={{ color: 'var(--ai-violet)' }}>{STATUS_LABELS[status]}</strong>.
                  A request must be approved by an administrator.
                </p>

                {form.requested_status ? (
                  <div className="space-y-3">
                    <div className="ai-box-soft flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                      <span>Requested upgrade to <strong>{STATUS_LABELS[form.requested_status]}</strong>
                        {initial.requested_status === form.requested_status ? ' — awaiting approval.' : ' (unsaved).'}</span>
                    </div>
                    <button onClick={() => { setSaved(false); setForm(f => ({ ...f, requested_status: null })); }} className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}>
                      Cancel request
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {canRequestEditor && (
                      <button onClick={() => { setSaved(false); setForm(f => ({ ...f, requested_status: 'editor' })); }} className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}>
                        <PencilLine className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
                        Request Editor status
                      </button>
                    )}
                    {canRequestAdmin && (
                      <button onClick={() => { setSaved(false); setForm(f => ({ ...f, requested_status: 'admin' })); }} className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}>
                        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
                        Request Administrator status
                      </button>
                    )}
                    {!canRequestEditor && !canRequestAdmin && (
                      <p style={{ fontSize: 13, color: 'var(--ai-noir70)' }}>You already have the highest access level.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {err && <p style={{ color: 'var(--ai-rouge)', fontSize: 12, marginTop: 12 }}>{err}</p>}

          {/* ── Save ── */}
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--ai-gris-clair)' }}>
            <div className="flex justify-end gap-2">
              <button onClick={save} disabled={!isDirty || saving} className="btn-primary"
                style={{ opacity: (!isDirty || saving) ? 0.5 : 1, cursor: (!isDirty || saving) ? 'default' : 'pointer' }}>
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
            {saved && (
              <p className="flex items-center justify-end gap-1.5 mt-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-vert, #1a9e6e)', margin: '8px 0 0' }}>
                <Check className="w-4 h-4" /> You successfully updated your profile
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Unsaved-changes confirmation ── */}
      {showLeave && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(48,50,62,.55)', padding: 24,
        }} onClick={e => { e.stopPropagation(); setShowLeave(false); }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-violet)', margin: '0 0 8px' }}>Unsaved changes</h2>
            <p style={{ fontSize: 13, color: 'var(--ai-noir70)', margin: '0 0 20px' }}>
              You have edited your profile without saving. Are you sure you want to leave the page?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary">Exit without saving</button>
              <button onClick={saveAndExit} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save and exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ), document.body);
}
