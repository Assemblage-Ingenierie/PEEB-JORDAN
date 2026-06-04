import { Shield, UserPlus, Mail, KeyRound } from 'lucide-react';

export default function Admin() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--ai-violet)' }}>Admin</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
          User account management
        </p>
      </div>

      <section className="card">
        <h3 className="text-xs font-bold uppercase tracking-wide mb-4 pb-2 flex items-center gap-2"
          style={{ color: 'var(--ai-rouge)', borderBottom: '1px dashed var(--ai-rouge)' }}>
          <Shield className="w-4 h-4" />
          Users
        </h3>

        <div className="rounded-lg p-4" style={{ background: 'var(--ai-gris-clair)', border: '1px solid var(--ai-gris)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ai-violet)' }}>
            Authentication backend not yet wired
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ai-noir70)' }}>
            This page will list users, allow inviting new ones by e-mail, assigning roles
            (admin / editor / viewer) and resetting passwords. Wire it to Supabase Auth
            when ready — the schema and RLS policies need to be created first.
          </p>
        </div>

        {/* Placeholder skeleton row */}
        <table className="w-full text-sm mt-4" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ai-violet)', color: 'white', fontSize: 11 }}>
              <th className="th" style={{ textAlign: 'left' }}>Name</th>
              <th className="th" style={{ textAlign: 'left' }}>E-mail</th>
              <th className="th" style={{ textAlign: 'left' }}>Role</th>
              <th className="th" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
              <td className="td" style={{ color: 'var(--ai-gris)' }} colSpan={4}>
                <em>No users yet — Supabase Auth integration pending.</em>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary text-xs" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <UserPlus className="w-3.5 h-3.5" /> Invite user
          </button>
          <button className="btn-secondary text-xs" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <Mail className="w-3.5 h-3.5" /> Resend invitation
          </button>
          <button className="btn-secondary text-xs" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <KeyRound className="w-3.5 h-3.5" /> Reset password
          </button>
        </div>
      </section>
    </div>
  );
}
