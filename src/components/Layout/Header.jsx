import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const VIEW_TITLES = {
  dashboard:  { title: 'Dashboard',          subtitle: 'Program overview & KPIs'                     },
  inventory:  { title: 'Building Inventory', subtitle: 'Searchable and sortable register'              },
  profile:    { title: 'Building Profile',   subtitle: 'Datasheet & renovation calculation'            },
  map:        { title: 'Map',                subtitle: 'Geographic location — OpenStreetMap'           },
  parameters: { title: 'Parameters',         subtitle: 'Currency, unit costs & exchange rate'          },
  calculator:     { title: 'EE Calculator',  subtitle: 'Renovation scenario modelling'                 },
  'new-building': { title: 'New Building',   subtitle: 'Create a new building from scratch'            },
};

const notifStyle = {
  success: { bg: 'var(--ai-rouge-clair)', border: 'var(--ai-rouge)', icon: CheckCircle, color: 'var(--ai-rouge)'   },
  error:   { bg: '#fff0f0',              border: '#ffc0c0',           icon: AlertCircle, color: 'var(--ai-rouge)'   },
  info:    { bg: 'var(--ai-gris-clair)', border: 'var(--ai-gris)',    icon: Info,        color: 'var(--ai-violet)'  },
};

function Notification({ notification, onClose }) {
  const style = notifStyle[notification.type] || notifStyle.info;
  const Icon  = style.icon;
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg max-w-sm fade-in"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: style.color }} />
      <p className="text-sm flex-1" style={{ color: 'var(--ai-violet)' }}>{notification.message}</p>
      <button onClick={onClose} style={{ color: 'var(--ai-noir70)' }}><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function Header() {
  const { view, notification, clearNotification, selectedBuilding } = useApp();
  const meta = VIEW_TITLES[view] || VIEW_TITLES.dashboard;

  const pageTitle    = view === 'profile' && selectedBuilding ? selectedBuilding.name : meta.title;
  const pageSubtitle = view === 'profile' && selectedBuilding
    ? `${selectedBuilding.typology} · ${selectedBuilding.governorate}`
    : meta.subtitle;

  return (
    <header className="no-print sticky top-0 z-30 px-6"
      style={{ background: 'var(--ai-header-bg)', height: 'var(--ai-header-height)',
               display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--ai-gris)' }}>
      <div className="flex items-center justify-between gap-4 w-full">

        <div className="min-w-0">
          <h1 className="font-bold truncate" style={{ fontSize: '17px', color: 'var(--ai-violet)', lineHeight: 1.2 }}>
            {pageTitle}
          </h1>
          <p className="truncate text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>{pageSubtitle}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {notification && <Notification notification={notification} onClose={clearNotification} />}
          <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--ai-noir70)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--ai-gris)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
