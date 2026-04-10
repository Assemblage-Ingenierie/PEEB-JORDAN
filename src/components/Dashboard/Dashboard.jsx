import {
  Building2, Leaf, Banknote, TrendingUp,
  AlertTriangle, CheckCircle, BarChart3, Layers, Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getFundingTier } from '../../engine/CalculationEngine';

// ─── Tier colours (Assemblage palette) ────────────────────────────────────────
const TIER_HEX = {
  slate:  '#DFE4E8',
  amber:  '#F9E1E3',
  blue:   '#f07070',
  green:  '#E30513',
  purple: '#30323E',
};

// ─── Compact KPI card — single-row: icon | value + label ──────────────────────
function CompactKpi({ icon: Icon, bg, value, label }) {
  return (
    <div className="card flex items-center gap-3 py-2.5 px-4" style={{ minWidth: 0 }}>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--ai-violet)' }}>
          {value}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--ai-noir70)' }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Labeled KPI row ──────────────────────────────────────────────────────────
function KpiRow({ title, kpis }) {
  const gridClass = kpis.length === 5
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'
    : 'grid grid-cols-2 lg:grid-cols-4 gap-3';
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ai-rouge)' }}>
        {title}
      </p>
      <div className={gridClass}>
        {kpis.map((kpi, i) => <CompactKpi key={i} {...kpi} />)}
      </div>
    </div>
  );
}

// ─── PEEB Tier Distribution bar ───────────────────────────────────────────────
function TierBar({ buildings }) {
  const tiers = buildings
    .filter(b => !b.eligibility.ineligible)
    .map(b => getFundingTier(b.calc?.energyGain ?? 0));

  const tierCounts = tiers.reduce((acc, t) => {
    if (!acc[t.label]) acc[t.label] = { count: 0, color: t.color };
    acc[t.label].count++;
    return acc;
  }, {});

  const total = tiers.length || 1;

  return (
    <div className="card fade-in">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
        <BarChart3 className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
        PEEB Tier Distribution
      </h3>
      <div className="flex h-5 rounded-full overflow-hidden gap-px mb-3">
        {Object.values(tierCounts).map((t, i) => (
          <div
            key={i}
            className="transition-all"
            style={{ width: `${(t.count / total) * 100}%`, background: TIER_HEX[t.color] }}
            title={`${t.count} building(s)`}
          />
        ))}
      </div>
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

// ─── Buildings by Typology ────────────────────────────────────────────────────
function TypologyChart({ buildings }) {
  const types = ['School', 'Hospital', 'Office', 'Municipality', 'University'];
  const counts = types
    .map(t => ({ t, n: buildings.filter(b => b.typology === t).length }))
    .filter(x => x.n > 0);
  const max = Math.max(...counts.map(x => x.n), 1);

  return (
    <div className="space-y-2.5">
      {counts.map(({ t, n }) => (
        <div key={t} className="flex items-center gap-3">
          <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--ai-noir70)' }}>{t}</span>
          <div className="flex-1 rounded-full h-2" style={{ background: 'var(--ai-gris-clair)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(n / max) * 100}%`, background: 'var(--ai-rouge)' }}
            />
          </div>
          <span className="text-xs font-bold w-4 text-right" style={{ color: 'var(--ai-violet)' }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PEEB Targeted Buildings table ───────────────────────────────────────────
function PeebTargetedTable({ buildings, selectBuilding, params }) {
  const targeted = buildings
    .filter(b => !b.eligibility.ineligible && (b.calc?.tier?.grantRate ?? 0) > 0)
    .sort((a, b) => (b.calc?.energyGain ?? 0) - (a.calc?.energyGain ?? 0));

  if (!targeted.length) {
    return (
      <p className="text-sm py-2" style={{ color: 'var(--ai-noir70)' }}>
        No buildings have reached Tier 1 yet. Select EE measures in building profiles to qualify.
      </p>
    );
  }

  const { currency, exchangeRate } = params;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--ai-violet)', borderBottom: '2px solid var(--ai-rouge)' }}>
            {['Building', 'Type', 'Governorate', 'Energy Gain', 'PEEB Tier', 'Grant'].map(h => (
              <th key={h} className="th" style={{ color: 'white' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targeted.map((b, i) => {
            const tier  = getFundingTier(b.calc?.energyGain ?? 0);
            const grant = b.calc?._jod?.peebGrant ?? 0;
            const grantDisplay = formatCurrency(
              currency === 'EUR' ? +(grant * exchangeRate).toFixed(0) : grant,
              currency, true
            );
            return (
              <tr
                key={b.id}
                className="tr-hover"
                style={{
                  background: i % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
                  borderBottom: '1px solid var(--ai-gris-clair)',
                }}
                onClick={() => selectBuilding(b.id)}
              >
                <td className="td font-semibold" style={{ color: 'var(--ai-rouge)' }}>{b.name}</td>
                <td className="td">
                  <span className="badge" style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}>
                    {b.typology}
                  </span>
                </td>
                <td className="td" style={{ color: 'var(--ai-noir70)' }}>{b.governorate}</td>
                <td className="td text-right font-bold" style={{ color: 'var(--ai-violet)' }}>
                  {b.calc?.energyGain?.toFixed(1) ?? '—'}%
                </td>
                <td className="td">
                  <span
                    className="badge"
                    style={{
                      background: TIER_HEX[tier.color],
                      color: ['green', 'purple'].includes(tier.color) ? 'white' : 'var(--ai-violet)',
                    }}
                  >
                    {tier.label}
                  </span>
                </td>
                <td className="td text-right font-semibold" style={{ color: 'var(--ai-violet)' }}>
                  {grantDisplay}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Alerts section ───────────────────────────────────────────────────────────
function AlertsSection({ buildings }) {
  const gapped     = buildings.filter(b => b.gaps.length > 0);
  const ineligible = buildings.filter(b => b.eligibility.ineligible);

  if (!gapped.length && !ineligible.length) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: '#22a05a' }}>
        <CheckCircle className="w-4 h-4" />
        All buildings have complete data and no conflicts.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {gapped.map(b => (
        <div
          key={`gap-${b.id}`}
          className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'var(--ai-rouge-clair)', borderLeft: '3px solid var(--ai-rouge)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-rouge)' }} />
          <div>
            <span className="font-semibold" style={{ color: 'var(--ai-violet)' }}>{b.name}</span>
            <span className="ml-2" style={{ color: 'var(--ai-noir70)' }}>
              Missing data: <em>{b.gaps.join(', ')}</em>
            </span>
          </div>
        </div>
      ))}
      {ineligible.map(b => (
        <div
          key={`inelig-${b.id}`}
          className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'var(--ai-gris-clair)', borderLeft: '3px solid var(--ai-gris)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-noir70)' }} />
          <div>
            <span className="font-semibold" style={{ color: 'var(--ai-violet)' }}>{b.name}</span>
            <span className="ml-2" style={{ color: 'var(--ai-noir70)' }}>
              Ineligible — donor already engaged: <strong>{b.eligibility.donor}</strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { buildings, params, selectBuilding } = useApp();
  const { currency, exchangeRate } = params;

  // PEEB targeted: eligible AND tier >= 1 (grantRate > 0)
  const peebTargeted = buildings.filter(
    b => !b.eligibility.ineligible && (b.calc?.tier?.grantRate ?? 0) > 0
  );

  // Currency conversion helper
  const toDisp = (jod) => currency === 'EUR' ? +(jod * exchangeRate).toFixed(0) : jod;
  const fmt    = (jod) => formatCurrency(toDisp(jod), currency, true);

  // ── Full database ────────────────────────────────────────────────────────────
  const fullArea       = buildings.reduce((s, b) => s + (b.area || 0), 0);
  const fullInvestment = buildings.reduce((s, b) => s + (b.calc?._jod?.capex || 0), 0);
  const fullBaseline   = buildings.reduce((s, b) => s + ((b.baselineEUI || 0) * (b.area || 0)), 0);
  const fullSaved      = buildings.reduce((s, b) => s + (b.calc?.energySavedKWh || 0), 0);
  const fullEnergyPct  = fullBaseline > 0 ? (fullSaved / fullBaseline * 100).toFixed(1) : '0.0';
  const fullCO2        = buildings.reduce((s, b) => s + (b.calc?.co2AvoidedTon || 0), 0);

  // ── PEEB targeted ────────────────────────────────────────────────────────────
  const tgtArea       = peebTargeted.reduce((s, b) => s + (b.area || 0), 0);
  const tgtInvestment = peebTargeted.reduce((s, b) => s + (b.calc?._jod?.capex || 0), 0);
  const tgtBaseline   = peebTargeted.reduce((s, b) => s + ((b.baselineEUI || 0) * (b.area || 0)), 0);
  const tgtSaved      = peebTargeted.reduce((s, b) => s + (b.calc?.energySavedKWh || 0), 0);
  const tgtEnergyPct  = tgtBaseline > 0 ? (tgtSaved / tgtBaseline * 100).toFixed(1) : '0.0';
  const tgtCO2        = peebTargeted.reduce((s, b) => s + (b.calc?.co2AvoidedTon || 0), 0);

  // ── Funding overview (all buildings) ─────────────────────────────────────────
  const totalPEEB     = buildings.reduce((s, b) => s + (b.calc?._jod?.peebGrant || 0), 0);
  const totalAFD      = buildings.reduce((s, b) => s + (b.afdLoan || 0), 0);
  const totalNational = buildings.reduce((s, b) => s + (b.nationalBudget || 0), 0);
  const totalOthers   = buildings.reduce((s, b) => s + (b.others || 0), 0);

  const kpisFull = [
    { icon: Building2, bg: 'var(--ai-violet)', value: buildings.length,                    label: 'Number of buildings'   },
    { icon: Layers,    bg: 'var(--ai-noir70)', value: fullArea.toLocaleString() + ' m²',   label: 'Total floor area'      },
    { icon: Banknote,  bg: 'var(--ai-rouge)',  value: fmt(fullInvestment),                 label: 'Est. total investment' },
    { icon: Zap,       bg: 'var(--ai-rouge)',  value: `${fullEnergyPct}%`,                 label: 'Est. energy reduction' },
    { icon: Leaf,      bg: '#22a05a',          value: `${fullCO2.toFixed(1)} tCO₂eq/yr`,  label: 'Est. GHG reduction'    },
  ];

  const kpisTargeted = [
    { icon: Building2, bg: 'var(--ai-violet)', value: peebTargeted.length,                label: 'Targeted buildings'    },
    { icon: Layers,    bg: 'var(--ai-noir70)', value: tgtArea.toLocaleString() + ' m²',   label: 'Total floor area'      },
    { icon: Banknote,  bg: 'var(--ai-rouge)',  value: fmt(tgtInvestment),                 label: 'Est. total investment' },
    { icon: Zap,       bg: 'var(--ai-rouge)',  value: `${tgtEnergyPct}%`,                 label: 'Est. energy reduction' },
    { icon: Leaf,      bg: '#22a05a',          value: `${tgtCO2.toFixed(1)} tCO₂eq/yr`,  label: 'Est. GHG reduction'    },
  ];

  const kpisFunding = [
    { icon: TrendingUp, bg: 'var(--ai-rouge)',  value: fmt(totalPEEB),     label: 'Total PEEB Grant' },
    { icon: Banknote,   bg: 'var(--ai-violet)', value: fmt(totalAFD),      label: 'AFD Loan'         },
    { icon: Banknote,   bg: 'var(--ai-noir70)', value: fmt(totalNational), label: 'National Budget'  },
    { icon: Banknote,   bg: '#64748b',          value: fmt(totalOthers),   label: 'Others'           },
  ];

  const alertCount = buildings.filter(b => b.gaps.length > 0 || b.eligibility.ineligible).length;

  return (
    <div className="space-y-6 fade-in">

      {/* ── 3 KPI rows ── */}
      <div className="space-y-4">
        <KpiRow title="Full Database"           kpis={kpisFull}    />
        <KpiRow title="PEEB Targeted Buildings" kpis={kpisTargeted} />
        <KpiRow title="Funding Overview"        kpis={kpisFunding} />
      </div>

      {/* ── Charts row: Tier bar + Typology ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TierBar buildings={buildings} />
        </div>
        <div className="card fade-in">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ai-violet)' }}>
            Buildings by Typology
          </h3>
          <TypologyChart buildings={buildings} />
        </div>
      </div>

      {/* ── PEEB Targeted Buildings table ── */}
      <div className="card fade-in">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--ai-violet)' }}>
            PEEB Targeted Buildings
          </h3>
          <span
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}
          >
            {peebTargeted.length} building{peebTargeted.length !== 1 ? 's' : ''}
          </span>
        </div>
        <PeebTargetedTable buildings={buildings} selectBuilding={selectBuilding} params={params} />
      </div>

      {/* ── Alerts ── */}
      <div className="card fade-in">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle
            className="w-4 h-4 flex-shrink-0"
            style={{ color: alertCount > 0 ? 'var(--ai-rouge)' : '#22a05a' }}
          />
          <h3 className="text-sm font-bold" style={{ color: 'var(--ai-violet)' }}>Alerts</h3>
          {alertCount > 0 && (
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}
            >
              {alertCount}
            </span>
          )}
        </div>
        <AlertsSection buildings={buildings} />
      </div>

    </div>
  );
}
