import {
  Building2, Leaf, Banknote, TrendingUp,
  AlertTriangle, CheckCircle, Clock, XCircle,
  BarChart3, ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { aggregateKPIs, formatCurrency, getFundingTier } from '../../engine/CalculationEngine';

// ─── Palette Assemblage pour les tiers ────────────────────────────────────────
// Progression gris → rouge clair → rouge → violet (du plus bas au plus élevé)
const TIER_HEX = {
  slate:  '#DFE4E8',  // below threshold — gris
  amber:  '#F9E1E3',  // Tier 1 50%     — rouge clair
  blue:   '#f07070',  // Tier 2 60%     — rouge moyen
  green:  '#E30513',  // Tier 3 70%     — rouge vif
  purple: '#30323E',  // Tier 4 80%     — violet sombre
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, bg, label, value, sub }) {
  return (
    <div className="kpi-card fade-in">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--ai-violet)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>{sub}</p>}
      <p className="text-xs font-semibold mt-1" style={{ color: 'var(--ai-noir70)' }}>{label}</p>
    </div>
  );
}

// ─── Funding Tier Distribution Bar ────────────────────────────────────────────
function TierBar({ buildings }) {
  const tiers = buildings
    .filter(b => !b.eligibility.ineligible)
    .map(b => getFundingTier(b.calc?.energyGain ?? 0));

  const tierCounts = tiers.reduce((acc, t) => {
    if (!acc[t.label]) acc[t.label] = { count: 0, color: t.color, rate: t.grantRate };
    acc[t.label].count++;
    return acc;
  }, {});

  const total = tiers.length || 1;

  return (
    <div className="card fade-in">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
        <BarChart3 className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
        Répartition par palier PEEB
      </h3>

      {/* Barre empilée */}
      <div className="flex h-5 rounded-full overflow-hidden gap-px mb-3">
        {Object.values(tierCounts).map((t, i) => (
          <div
            key={i}
            className="transition-all"
            style={{ width: `${(t.count / total) * 100}%`, background: TIER_HEX[t.color] }}
            title={`${t.count} bâtiment(s)`}
          />
        ))}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(tierCounts).map(([label, t]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ai-noir70)' }}>
            <span
              className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
              style={{ background: TIER_HEX[t.color] }}
            />
            <span>{label}</span>
            <span className="font-bold" style={{ color: 'var(--ai-violet)' }}>({t.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top buildings ─────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  'Assessed':      'badge-green',
  'Pending Audit': 'badge-amber',
  'Ineligible':    'badge-red',
};

function TopBuildings({ buildings, navigate, selectBuilding }) {
  const sorted = [...buildings]
    .filter(b => !b.eligibility.ineligible && b.calc)
    .sort((a, b) => (b.calc.energyGain ?? 0) - (a.calc.energyGain ?? 0))
    .slice(0, 5);

  return (
    <div className="card fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
          Top bâtiments éligibles par gain d'énergie
        </h3>
        <button
          onClick={() => navigate('inventory')}
          className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--ai-rouge)' }}
        >
          Voir tout <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ai-rouge)' }}>
              <th className="th">Bâtiment</th>
              <th className="th text-right">Gain %</th>
              <th className="th text-right">Palier</th>
              <th className="th">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(b => {
              const tier = getFundingTier(b.calc?.energyGain ?? 0);
              return (
                <tr
                  key={b.id}
                  className="tr-hover"
                  style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}
                  onClick={() => selectBuilding(b.id)}
                >
                  <td className="td font-semibold" style={{ color: 'var(--ai-rouge)' }}>{b.name}</td>
                  <td className="td text-right font-bold">{b.calc?.energyGain?.toFixed(1) ?? '—'}%</td>
                  <td className="td text-right">
                    <span
                      className="badge"
                      style={{ background: TIER_HEX[tier.color], color: ['green','purple'].includes(tier.color) ? 'white' : 'var(--ai-violet)', border: 'none' }}
                    >
                      {Math.round(tier.grantRate * 100)}%
                    </span>
                  </td>
                  <td className="td">
                    <span className={STATUS_BADGE[b.status] || 'badge-slate'}>{b.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { buildings, params, navigate, selectBuilding } = useApp();

  const eligible   = buildings.filter(b => !b.eligibility.ineligible);
  const assessed   = buildings.filter(b => b.status === 'Assessed');
  const pending    = buildings.filter(b => b.status === 'Pending Audit');
  const ineligible = buildings.filter(b => b.status === 'Ineligible');
  const gapped     = buildings.filter(b => b.gaps.length > 0);

  const kpis      = aggregateKPIs(eligible.map(b => ({ ...b })));
  const { currency, exchangeRate } = params;

  const grantDisplay = formatCurrency(
    currency === 'EUR' ? +(kpis.totalPEEBGrant * exchangeRate).toFixed(0) : kpis.totalPEEBGrant,
    currency, true
  );

  return (
    <div className="space-y-6 fade-in">

      {/* ── Bandeaux d'alerte ── */}
      {gapped.length > 0 && (
        <div className="ai-box-soft fade-in flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-rouge)' }} />
          <span className="text-sm">
            <strong>{gapped.length} bâtiment(s)</strong> avec données manquantes — valeurs suggérées en <em>italique</em> dans l'inventaire.
          </span>
        </div>
      )}
      {ineligible.length > 0 && (
        <div className="ai-box-soft fade-in flex items-start gap-3">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-rouge)' }} />
          <span className="text-sm">
            <strong>{ineligible.length} bâtiment(s) inéligibles</strong> — financement donateur (GIZ / KfW) déjà engagé.
          </span>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={Building2}  bg="var(--ai-violet)" label="Total bâtiments"     value={buildings.length}                   sub={`${eligible.length} éligibles`} />
        <KpiCard icon={BarChart3}  bg="var(--ai-noir70)" label="Surface totale"      value={kpis.totalArea.toLocaleString()}    sub="m² tous sites" />
        <KpiCard icon={Leaf}       bg="var(--ai-rouge)"  label="tCO₂ évitées / an"   value={kpis.totalCO2Avoided.toLocaleString()} sub="Projection annuelle" />
        <KpiCard icon={Banknote}   bg="var(--ai-rouge)"  label="Subvention PEEB"     value={grantDisplay}                       sub="Bâtiments éligibles" />
        <KpiCard icon={CheckCircle} bg="#22a05a"         label="Évalués"              value={assessed.length} />
        <KpiCard icon={Clock}      bg="#d97706"          label="En attente"           value={pending.length} />
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-1">
          <TierBar buildings={buildings} />
        </div>

        {/* Statuts */}
        <div className="card fade-in">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ai-violet)' }}>Répartition des statuts</h3>
          <div className="space-y-3">
            {[
              { label: 'Évalués',      count: assessed.length,   bg: 'var(--ai-rouge)', text: 'var(--ai-rouge)' },
              { label: 'En attente',   count: pending.length,    bg: '#d97706',          text: '#d97706' },
              { label: 'Inéligibles',  count: ineligible.length, bg: 'var(--ai-violet)', text: 'var(--ai-violet)' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs font-medium w-28 flex-shrink-0" style={{ color: s.text }}>{s.label}</span>
                <div className="flex-1 rounded-full h-2" style={{ background: 'var(--ai-gris-clair)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(s.count / buildings.length) * 100}%`, background: s.bg }}
                  />
                </div>
                <span className="text-xs font-bold w-5 text-right" style={{ color: 'var(--ai-violet)' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Typologies */}
        <div className="card fade-in">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ai-violet)' }}>Bâtiments par typologie</h3>
          <div className="space-y-2">
            {['School','Hospital','Office','Municipality','University'].map(t => {
              const cnt = buildings.filter(b => b.typology === t).length;
              if (!cnt) return null;
              return (
                <div key={t} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--ai-noir70)' }}>{t}</span>
                  <span className="font-bold" style={{ color: 'var(--ai-violet)' }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Top buildings ── */}
      <TopBuildings buildings={buildings} navigate={navigate} selectBuilding={selectBuilding} />

    </div>
  );
}
