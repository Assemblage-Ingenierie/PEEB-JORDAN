import { AppProvider, useApp } from './context/AppContext';
import Sidebar           from './components/Layout/Sidebar';
import Header            from './components/Layout/Header';
import Dashboard         from './components/Dashboard/Dashboard';
import BuildingInventory from './components/Buildings/BuildingInventory';
import BuildingProfile   from './components/Buildings/BuildingProfile';
import NewBuilding       from './components/Buildings/NewBuilding';
import MapView           from './components/Map/MapView';
import Parameters        from './components/Parameters/Parameters';
import FundingCalculator from './components/Calculator/FundingCalculator';

function ActiveView() {
  const { view } = useApp();
  switch (view) {
    case 'dashboard':    return <Dashboard />;
    case 'inventory':    return <BuildingInventory />;
    case 'profile':      return <BuildingProfile />;
    case 'map':          return <MapView />;
    case 'parameters':   return <Parameters />;
    case 'new-building': return <NewBuilding />;
    case 'calculator':   return <FundingCalculator />;
    default:             return <Dashboard />;
  }
}

function Shell() {
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
      <div className="ai-watermark no-print" aria-hidden="true">.A</div>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
