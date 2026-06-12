import { useState } from 'react';
import {
  LayoutDashboard, Building2, Map,
  SlidersHorizontal, ChevronRight, Shield, BookOpen, LogOut, KeyRound, UserCog,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import RequestAccessModal from '../auth/RequestAccessModal';
import MyAccountModal from '../auth/MyAccountModal';
import { pathFromState, isModifiedClick } from '../../lib/router';

const NAV = [
  { id: 'guide',        label: 'Guide',         Icon: BookOpen          },
  { id: 'dashboard',    label: 'Dashboard',     Icon: LayoutDashboard   },
  { id: 'inventory',    label: 'Buildings',     Icon: Building2         },
  { id: 'map',          label: 'Map View',      Icon: Map               },
  { id: 'parameters',   label: 'Parameters',    Icon: SlidersHorizontal, adminOnly: true },
  { id: 'admin',        label: 'Admin',         Icon: Shield,            adminOnly: true },
];

export default function Sidebar() {
  const { view, navigate, buildings } = useApp();
  const { isAdmin, profile, logout } = useAuth();
  const [logoFailed, setLogoFailed] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const nav = NAV.filter(item => !item.adminOnly || isAdmin);

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
        {nav.map(({ id, label, Icon }) => {
          const active = view === id;
          const href = pathFromState(id);
          return (
            <a
              key={id}
              href={href}
              onClick={e => { if (isModifiedClick(e)) return; e.preventDefault(); navigate(id); }}
              className="w-full flex items-center justify-between gap-3 py-2.5 text-sm font-medium transition-all rounded-lg no-underline"
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
            </a>
          );
        })}
      </nav>

      {/* ── Utilisateur + déconnexion ── */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        {!isAdmin && (
          <button
            onClick={() => setShowRequest(true)}
            className="w-full flex items-center gap-2 px-2 py-2 mb-2 rounded-lg text-xs font-medium transition-all"
            style={{ color: 'rgba(255,255,255,.6)', background: 'rgba(255,255,255,.05)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.10)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
          >
            <KeyRound className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
            {profile?.requested_status ? 'Request pending…' : 'Request access'}
          </button>
        )}
        <div className="flex items-center justify-between gap-2" style={{ position: 'relative' }}>
          {/* Pop-up "My account" */}
          {showUserMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setShowUserMenu(false)} />
              <div
                className="rounded-lg shadow-xl"
                style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40,
                  background: 'white', border: '1px solid var(--ai-gris-clair)', padding: 4,
                }}
              >
                <button
                  onClick={() => { setShowUserMenu(false); setShowAccount(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all"
                  style={{ color: 'var(--ai-violet)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--ai-gris-clair)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <UserCog className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                  My account
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="min-w-0 flex-1 text-left p-1 rounded-lg transition-all"
            style={{ background: showUserMenu ? 'rgba(255,255,255,.10)' : 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { if (!showUserMenu) e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
            onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.background = 'transparent'; }}
            title="My account"
          >
            <div className="text-xs font-semibold truncate" style={{ color: 'white' }}>
              {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email : ''}
            </div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,.45)' }}>
              {profile?.status === 'admin' ? 'Administrator'
                : profile?.status === 'editor' ? 'Editor'
                : 'Viewer'}
            </div>
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="flex-shrink-0 p-2 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,.55)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.55)'; }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showRequest && <RequestAccessModal onClose={() => setShowRequest(false)} />}
      {showAccount && <MyAccountModal onClose={() => setShowAccount(false)} />}

    </aside>
  );
}
