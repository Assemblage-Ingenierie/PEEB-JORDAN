import {
  AlertTriangle, CheckCircle, BarChart3, TrendingUp, Calculator, Banknote,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency, getFundingTier, computeBudgetBreakdown, DEFAULT_BUDGET_CONFIG,
} from '../../engine/CalculationEngine';

// ─── Tier colours (Assemblage palette) — kept for PEEB Targeted table ─────────
const TIER_HEX = {
  slate:  '#DFE4E8',
  amber:  '#F9E1E3',
  blue:   '#f07070',
  green:  '#E30513',
  purple: '#30323E',
};

// ─── KPI Table: Full Database vs PEEB side-by-side ────────────────────────────
function KpiTable({ rows }) {
  return (
    <div className="card fade-in">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
        <BarChart3 className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
        Portfolio KPIs
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--ai-violet)' }}>
              <th className="th" style={{ color: 'white' }}>Indicator</th>
              <th className="th" style={{ color: 'white', textAlign: 'right' }}>Full Database</th>
              <th className="th" style={{ color: 'white', textAlign: 'right' }}>PEEB Targeted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} style={{
                background: i % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
                borderBottom: '1px solid var(--ai-gris-clair)',
              }}>
                <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>{r.label}</td>
                <td className="td text-right" style={{ color: 'var(--ai-noir70)' }}>{r.full}</td>
                <td className="td text-right font-bold" style={{ color: 'var(--ai-rouge)' }}>{r.peeb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Funding overview: single-column table ────────────────────────────────────
function FundingTable({ rows, total, currency }) {
  return (
    <div className="card fade-in">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
        <Banknote className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
        Funding overview (PEEB targeted)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--ai-violet)' }}>
              <th className="th" style={{ color: 'white' }}>Source</th>
              <th className="th" style={{ color: 'white', textAlign: 'right' }}>Amount</th>
              <th className="th" style={{ color: 'white', textAlign: 'right', width: 100 }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = total > 0 ? (r.raw / total * 100).toFixed(1) : '0.0';
              return (
                <tr key={r.label} style={{
                  background: i % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
                  borderBottom: '1px solid var(--ai-gris-clair)',
                }}>
                  <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>
                    {r.label}
                    {r.note && (
                      <span className="ml-1 text-xs italic font-normal" style={{ color: 'var(--ai-rouge)' }}>
                        ({r.note})
                      </span>
                    )}
                  </td>
                  <td className="td text-right font-bold" style={{ color: 'var(--ai-violet)' }}>{r.amount}</td>
                  <td className="td text-right text-xs" style={{ color: 'var(--ai-noir70)' }}>{pct}%</td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--ai-violet)' }}>
              <td className="td font-black text-white">Total funding</td>
              <td className="td text-right font-black text-white">{formatCurrency(total, currency, true)}</td>
              <td className="td text-right font-black text-white">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Budget decomposition: ordered breakdown ──────────────────────────────────
function BudgetTable({ breakdown, currency }) {
  const fmt = (v) => formatCurrency(v, currency, true);
  return (
    <div className="card fade-in">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
        <Calculator className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
        Project budget decomposition
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--ai-violet)' }}>
              <th className="th" style={{ color: 'white' }}>Line item</th>
              <th className="th" style={{ color: 'white' }}>Basis</th>
              <th className="th" style={{ color: 'white', textAlign: 'right' }}>Amount</th>
              <th className="th" style={{ color: 'white', textAlign: 'right', width: 100 }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((r, i) => {
              const pct = breakdown.total > 0 ? (r.amount / breakdown.total * 100).toFixed(1) : '0.0';
              const basis = r.base
                ? 'Works (from buildings)'
                : r.locked
                  ? `${r.value}% × all items above`
                  : r.type === 'absolute'
                    ? `Fixed amount`
                    : `${r.value}% × ${(r.appliesTo ?? []).length} item(s)`;
              return (
                <tr key={r.id} style={{
                  background: r.locked ? 'var(--ai-rouge-clair)' : (i % 2 === 0 ? 'white' : 'var(--ai-gris-clair)'),
                  borderBottom: '1px solid var(--ai-gris-clair)',
                }}>
                  <td className="td font-semibold" style={{ color: r.locked ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
                    {r.label}
                  </td>
                  <td className="td text-xs" style={{ color: 'var(--ai-noir70)' }}>{basis}</td>
                  <td className="td text-right font-bold" style={{ color: r.locked ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
                    {fmt(r.amount)}
                  </td>
                  <td className="td text-right text-xs" style={{ color: 'var(--ai-noir70)' }}>{pct}%</td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--ai-violet)' }}>
              <td className="td font-black text-white" colSpan={2}>Total project budget</td>
              <td className="td text-right font-black text-white">{fmt(breakdown.total)}</td>
              <td className="td text-right font-black text-white">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Buildings by Typology ────────────────────────────────────────────────────
function TypologyChart({ buildings, peebTargeted }) {
  const types = ['School', 'Hospital', 'Office', 'Municipality', 'University'];
  const rows = types
    .map(t => ({
      t,
      total:   buildings.filter(b => b.typology === t).length,
      targeted: peebTargeted.filter(b => b.typology === t).length,
    }))
    .filter(x => x.total > 0);
  const max = Math.max(...rows.map(x => x.total), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ai-noir70)' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--ai-gris)' }} />
          Full Database
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ai-noir70)' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--ai-rouge)' }} />
          PEEB Targeted
        </span>
      </div>

      {rows.map(({ t, total, targeted }) => (
        <div key={t} className="space-y-0.5 py-1.5" style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--ai-violet)' }}>{t}</span>
            <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
              <strong style={{ color: 'var(--ai-violet)' }}>{targeted}</strong>
              <span className="mx-0.5">/</span>
              {total}
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--ai-gris-clair)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(total / max) * 100}%`, background: 'var(--ai-gris)' }}
            />
            {targeted > 0 && (
              <div
                className="absolute top-0 left-0 h-2 rounded-full transition-all"
                style={{ width: `${(targeted / max) * 100}%`, background: 'var(--ai-rouge)' }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PEEB Targeted Buildings table ───────────────────────────────────────────
function PeebTargetedTable({ buildings, selectBuilding, params }) {
  const targeted = buildings
    .filter(b => b.peebSelected === true && !b.eligibility.ineligible)
    .sort((a, b) => (b.calc?.energyGain ?? 0) - (a.calc?.energyGain ?? 0));

  if (!targeted.length) {
    return (
      <p className="text-sm py-2" style={{ color: 'var(--ai-noir70)' }}>
        No buildings selected for PEEB. Enable &ldquo;Include in PEEB program&rdquo; in each building profile.
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

// ─── Alerts: compact row format matching Buildings inventory ──────────────────
function AlertsSection({ buildings }) {
  const gapped     = buildings.filter(b => b.gaps.length > 0);
  const ineligible = buildings.filter(b => b.eligibility.ineligible);

  if (!gapped.length && !ineligible.length) {
    return (
      <div className="flex items-center gap-2 text-sm px-3 py-2.5" style={{ color: '#22a05a' }}>
        <CheckCircle className="w-4 h-4" />
        All buildings have complete data and no conflicts.
      </div>
    );
  }

  return (
    <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
      <tbody>
        {gapped.map((b, i) => (
          <tr key={`gap-${b.id}`} style={{
            background: i % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
            borderLeft: '3px solid var(--ai-rouge)',
          }}>
            <td className="td" style={{ width: 28 }}>
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--ai-rouge)' }} />
            </td>
            <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>{b.name}</td>
            <td className="td" style={{ color: 'var(--ai-noir70)' }}>
              Missing data: <em>{b.gaps.join(', ')}</em>
            </td>
          </tr>
        ))}
        {ineligible.map((b, i) => (
          <tr key={`inelig-${b.id}`} style={{
            background: (gapped.length + i) % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
            borderLeft: '3px solid var(--ai-gris)',
          }}>
            <td className="td" style={{ width: 28 }}>
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--ai-noir70)' }} />
            </td>
            <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>{b.name}</td>
            <td className="td" style={{ color: 'var(--ai-noir70)' }}>
              Ineligible — donor already engaged: <strong>{b.eligibility.donor}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { buildings: allBuildings, params, selectBuilding } = useApp();
  const buildings = allBuildings.filter(b => !b.isDraft);
  const { currency, exchangeRate } = params;

  const peebTargeted = buildings.filter(
    b => b.peebSelected === true && !b.eligibility.ineligible
  );

  const toDisp = (jod) => currency === 'EUR' ? +(jod * exchangeRate).toFixed(0) : jod;
  const fmt    = (jod) => formatCurrency(toDisp(jod), currency, true);

  // ── Full database aggregates ───────────────────────────────────────────────
  const fullArea       = buildings.reduce((s, b) => s + (b.area || 0), 0);
  const fullInvestment = buildings.reduce((s, b) => s + (b.calc?._jod?.capex   || 0), 0);
  const fullEeCapex    = buildings.reduce((s, b) => s + (b.calc?._jod?.eeCapex || 0), 0);
  const fullGrCapex    = buildings.reduce((s, b) => s + (b.calc?._jod?.grCapex || 0), 0);
  const fullBaseline   = buildings.reduce((s, b) => s + ((b.baselineEUI || 0) * (b.area || 0)), 0);
  const fullSaved      = buildings.reduce((s, b) => s + (b.calc?.energySavedKWh || 0), 0);
  const fullEnergyPct  = fullBaseline > 0 ? (fullSaved / fullBaseline * 100).toFixed(1) : '0.0';
  const fullCO2        = buildings.reduce((s, b) => s + (b.calc?.co2AvoidedTon || 0), 0);

  // ── PEEB targeted aggregates ───────────────────────────────────────────────
  const tgtArea       = peebTargeted.reduce((s, b) => s + (b.area || 0), 0);
  const tgtInvestment = peebTargeted.reduce((s, b) => s + (b.calc?._jod?.capex   || 0), 0);
  const tgtEeCapex    = peebTargeted.reduce((s, b) => s + (b.calc?._jod?.eeCapex || 0), 0);
  const tgtGrCapex    = peebTargeted.reduce((s, b) => s + (b.calc?._jod?.grCapex || 0), 0);
  const tgtBaseline   = peebTargeted.reduce((s, b) => s + ((b.baselineEUI || 0) * (b.area || 0)), 0);
  const tgtSaved      = peebTargeted.reduce((s, b) => s + (b.calc?.energySavedKWh || 0), 0);
  const tgtEnergyPct  = tgtBaseline > 0 ? (tgtSaved / tgtBaseline * 100).toFixed(1) : '0.0';
  const tgtCO2        = peebTargeted.reduce((s, b) => s + (b.calc?.co2AvoidedTon || 0), 0);

  // Eligible for PEEB grant: EE capex of PEEB-targeted buildings meeting the
  // minimum-gain threshold (≥30 % → funding tier 1+).
  const tgtEligibleAmount = peebTargeted
    .filter(b => (b.calc?.energyGain ?? 0) >= 30)
    .reduce((s, b) => s + (b.calc?._jod?.eeCapex || 0), 0);

  const kpiRows = [
    { label: 'Number of buildings',              full: buildings.length,                        peeb: peebTargeted.length },
    { label: 'Total floor area',                 full: fullArea.toLocaleString() + ' m²',       peeb: tgtArea.toLocaleString() + ' m²' },
    { label: 'Est. total investment',            full: fmt(fullInvestment),                     peeb: fmt(tgtInvestment) },
    { label: 'CAPEX — Energy efficiency',        full: fmt(fullEeCapex),                        peeb: fmt(tgtEeCapex) },
    { label: 'CAPEX — Global refurbishment',     full: fmt(fullGrCapex),                        peeb: fmt(tgtGrCapex) },
    { label: 'Total amount eligible to PEEB grant', full: '—',                                  peeb: fmt(tgtEligibleAmount) },
    { label: 'Est. energy reduction',            full: `${fullEnergyPct}%`,                     peeb: `${tgtEnergyPct}%` },
    { label: 'Est. GHG reduction',               full: `${fullCO2.toFixed(1)} tCO₂eq/yr`,       peeb: `${tgtCO2.toFixed(1)} tCO₂eq/yr` },
  ];

  // ── Funding overview (PEEB-targeted only) ──────────────────────────────────
  // The funding total is reconciled to Est. total investment: any gap between
  // the declared sources (PEEB + AFD + National + Others) and the estimated
  // investment is pushed into "Others — to be defined".
  const totalPEEB     = peebTargeted.reduce((s, b) => s + (b.calc?._jod?.peebGrant || 0), 0);
  const totalAFD      = peebTargeted.reduce((s, b) => s + (b.afdLoan || 0), 0);
  const totalNational = peebTargeted.reduce((s, b) => s + (b.nationalBudget || 0), 0);
  const totalOthersRaw = peebTargeted.reduce((s, b) => s + (b.others || 0), 0);

  const declaredSum = totalPEEB + totalAFD + totalNational + totalOthersRaw;
  const gap         = Math.max(0, tgtInvestment - declaredSum);
  const totalOthers = totalOthersRaw + gap;
  const fundingTotal = toDisp(totalPEEB + totalAFD + totalNational + totalOthers);

  const fundingRows = [
    { label: 'PEEB Grant',      raw: toDisp(totalPEEB),     amount: fmt(totalPEEB) },
    { label: 'AFD Loan',        raw: toDisp(totalAFD),      amount: fmt(totalAFD) },
    { label: 'National Budget', raw: toDisp(totalNational), amount: fmt(totalNational) },
    {
      label:  'Others',
      raw:    toDisp(totalOthers),
      amount: fmt(totalOthers),
      note:   gap > 0 ? 'to be defined' : null,
    },
  ];

  // ── Budget decomposition (PEEB-targeted works baseline) ────────────────────
  const budgetConfig = params.budgetConfig ?? DEFAULT_BUDGET_CONFIG;
  const breakdown = computeBudgetBreakdown(
    { ee_works: toDisp(tgtEeCapex), gr_works: toDisp(tgtGrCapex) },
    budgetConfig,
  );

  const alertCount = buildings.filter(b => b.gaps.length > 0 || b.eligibility.ineligible).length;

  return (
    <div className="space-y-6 fade-in">

      {/* ── KPI table ── */}
      <KpiTable rows={kpiRows} />

      {/* ── Funding + Budget side by side on wide screens ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FundingTable rows={fundingRows} total={fundingTotal} currency={currency} />
        <BudgetTable breakdown={breakdown} currency={currency} />
      </div>

      {/* ── Typology chart ── */}
      <div className="card fade-in">
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ai-violet)' }}>
          Buildings by Typology
        </h3>
        <TypologyChart buildings={buildings} peebTargeted={peebTargeted} />
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

      {/* ── Compact alerts — constrained width, same row height as Buildings ── */}
      <div className="card fade-in" style={{ maxWidth: '900px' }}>
        <div className="flex items-center gap-2 mb-3">
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
