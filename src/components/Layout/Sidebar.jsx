import { useState } from 'react';
import {
  LayoutDashboard, Building2, Map,
  SlidersHorizontal, PlusCircle, ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',     Icon: LayoutDashboard   },
  { id: 'inventory',    label: 'Buildings',     Icon: Building2         },
  { id: 'map',          label: 'Map View',      Icon: Map               },
  { id: 'new-building', label: 'New Building',  Icon: PlusCircle        },
  { id: 'parameters',   label: 'Parameters',    Icon: SlidersHorizontal },
];

export default function Sidebar() {
  const { view, navigate, buildings } = useApp();
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <aside
      id="sidebar"
      className="no-print fixed top-0 left-0 h-full flex flex-col z-40 shadow-xl"
      style={{ width: 'var(--ai-sidebar-width)', background: 'var(--ai-sidebar-bg)' }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,.08)', minHeight: 'var(--ai-header-height)' }}
      >
        {/* PNG logo from /public/logo_assemblage.png */}
        {!logoFailed ? (
          <img
            src="/logo_assemblage.png"
            alt="Assemblage ingénierie"
            style={{ height: '40px', maxWidth: '180px', objectFit: 'contain' }}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span
            style={{
              fontWeight: 800,
              fontStyle: 'italic',
              fontSize: '16px',
              color: '#E30513',
              lineHeight: 1.1,
              fontFamily: 'var(--ai-font)',
            }}
          >
            Assembl!age<br />ingénierie
          </span>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className="w-full flex items-center justify-between gap-3 py-2.5 text-sm font-medium transition-all rounded-lg"
              style={{
                paddingLeft:  active ? '17px' : '20px',
                paddingRight: '12px',
                borderLeft:   active ? '3px solid var(--ai-rouge)' : '3px solid transparent',
                background:   active ? 'rgba(255,255,255,.10)' : 'transparent',
                color:        active ? 'white' : 'rgba(255,255,255,.55)',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.55)'; } }}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? 'var(--ai-rouge)' : 'inherit' }} />
                {label}
              </span>
              <span className="flex items-center gap-1.5">
                {id === 'inventory' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)' }}>
                    {buildings.filter(b => !b.isDraft).length}
                  </span>
                )}
                {active && <ChevronRight className="w-3 h-3" style={{ color: 'var(--ai-rouge)' }} />}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Séparateur ── */}
      <div style={{ borderTop: '1px dashed rgba(227,5,19,.35)', margin: '0 16px 12px' }} />

      {/* ── Pied légal ── */}
      <div className="px-4 pb-5 space-y-0.5" style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)' }}>
        <p className="font-semibold" style={{ color: 'rgba(255,255,255,.55)' }}>Assemblage ingénierie S.A.S.U.</p>
        <p>79 rue Victor Hugo, 94200 Ivry-sur-Seine</p>
        <p>contact@assemblage.net</p>
        <p style={{ color: 'rgba(255,255,255,.2)', marginTop: '4px' }}>v2.0 — PEEB Med Jordan 2025</p>
      </div>
    </aside>
  );
}
