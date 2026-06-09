import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import AuthGate          from './components/auth/AuthGate';
import Sidebar           from './components/Layout/Sidebar';
import Header            from './components/Layout/Header';
import Dashboard         from './components/Dashboard/Dashboard';
import BuildingInventory from './components/Buildings/BuildingInventory';
import BuildingProfile   from './components/Buildings/BuildingProfile';
import NewBuilding       from './components/Buildings/NewBuilding';
import MapView           from './components/Map/MapView';
import Parameters        from './components/Parameters/Parameters';
import FundingCalculator from './components/Calculator/FundingCalculator';
import Admin             from './components/Admin/Admin';
import Guide             from './components/Guide/Guide';
import ErrorBoundary     from './components/ErrorBoundary';

function ActiveView() {
  const { view, isAdmin } = useApp();
  // Admin-only views are not reachable by non-admins, even via a direct URL.
  if ((view === 'parameters' || view === 'admin') && !isAdmin) {
    return <Dashboard />;
  }
  switch (view) {
    case 'dashboard':    return <Dashboard />;
    case 'inventory':    return <BuildingInventory />;
    case 'profile':      return <BuildingProfile />;
    case 'map':          return <MapView />;
    case 'parameters':   return <Parameters />;
    case 'new-building': return <NewBuilding />;
    case 'calculator':   return <FundingCalculator />;
    case 'admin':        return <Admin />;
    case 'guide':        return <Guide />;
    default:             return <Dashboard />;
  }
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--ai-gris-clair)',
      fontFamily: 'var(--ai-font)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid var(--ai-gris)',
          borderTopColor: 'var(--ai-rouge)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: 'var(--ai-noir70)', fontSize: 13 }}>Loading data…</p>
      </div>
    </div>
  );
}

function Shell() {
  const { loading } = useApp();
  if (loading) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--ai-gris-clair)' }}>

      {/* Sidebar violet sombre */}
      <Sidebar />

      {/* Zone principale */}
      <div
        id="main-content"
        className="flex-1 flex flex-col min-h-screen min-w-0"
        style={{ marginLeft: 'var(--ai-sidebar-width)' }}
      >
        <Header />

        <main
          className="flex-1 overflow-auto"
          style={{ padding: 'var(--ai-content-padding)' }}
        >
          <ActiveView />
        </main>
      </div>

      {/* ── Sigle .A (filigrane Assemblage ingénierie) ── */}
      <img src="/logo-A.png" alt="" className="ai-watermark no-print" aria-hidden="true" />

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <Shell />
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}
