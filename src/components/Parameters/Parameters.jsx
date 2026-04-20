import { SlidersHorizontal, RefreshCw, Info, Target, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MEASURE_META, MEASURE_KEYS_EE,
  DEFAULT_SCORE_CONFIG, SCORE_INDICATORS, TYPOLOGY_DEFAULTS,
  buildDefaultSavingsByTypology,
} from '../../engine/CalculationEngine';

function ParamRow({ label, value, onChange, min, max, step, unit, hint }) {
  return (
    <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--ai-violet)' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>{hint}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="input w-28 text-right"
        />
        {unit && <span className="text-xs w-16" style={{ color: 'var(--ai-noir70)' }}>{unit}</span>}
      </div>
    </div>
  );
}

const DEFAULT_FINANCIAL_PARAMS = {
  exchangeRate: 1.36,
  energyCost:   0.085,
  unitCosts: {
    insulation: 25, windows: 80, hvac: 130, lighting: 20, pv: 150, solarThermal: 120,
    structure: 130, accessibility: 70, hygieneAndSecurity: 60,
  },
};

const SLOT_COLORS = ['var(--ai-rouge)', 'var(--ai-violet)', '#22a05a', '#d97706', '#3b82f6'];

// Sorted list of indicator options for the dropdowns
const INDICATOR_OPTIONS = Object.entries(SCORE_INDICATORS).map(([key, ind]) => ({
  key,
  label: ind.label,
  unit: ind.unit,
  direction: ind.direction,
}));

function ScoreCriterionRow({ index, criterion, onUpdate }) {
  const ind = SCORE_INDICATORS[criterion.indicator];
  const slotColor = SLOT_COLORS[index % SLOT_COLORS.length];

  const handleIndicatorChange = (newKey) => {
    const newInd = SCORE_INDICATORS[newKey];
    onUpdate({ indicator: newKey, cap: newInd?.defaultCap ?? 100 });
  };

  return (
    <div
      className="rounded-lg p-4 mb-3"
      style={{ background: 'var(--ai-gris)', border: `2px solid ${slotColor}22` }}
    >
      {/* Slot header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-black px-2 py-0.5 rounded"
          style={{ background: slotColor, color: 'white', minWidth: '60px', textAlign: 'center' }}
        >
          Slot {index + 1}
        </span>
        {/* Direction badge — read-only from indicator definition */}
        {ind && (
          <span
            className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background: ind.direction === 'higher' ? '#dcfce7' : '#fef3c7',
              color:       ind.direction === 'higher' ? '#16a34a' : '#d97706',
            }}
          >
            {ind.direction === 'higher'
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {ind.direction === 'higher' ? 'Higher = better' : 'Lower = better'}
          </span>
        )}
      </div>

      {/* Indicator selector */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ai-noir70)' }}>
          Indicator
        </label>
        <select
          value={criterion.indicator}
          onChange={e => handleIndicatorChange(e.target.value)}
          className="input w-full text-sm"
          style={{ color: 'var(--ai-violet)', fontWeight: 600 }}
        >
          {INDICATOR_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>
              {opt.label} ({opt.unit}) — {opt.direction === 'higher' ? '↑ higher better' : '↓ lower better'}
            </option>
          ))}
        </select>
      </div>

      {/* Max points + Cap threshold */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ai-noir70)' }}>
            Max points
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0} max={100} step={1}
              value={criterion.max}
              onChange={e => onUpdate({ max: parseFloat(e.target.value) || 0 })}
              className="input w-full text-right"
            />
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ai-noir70)' }}>pts</span>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ai-noir70)' }}>
            {ind?.direction === 'lower' ? 'Zero-score threshold' : 'Full-score threshold'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0} step="any"
              value={criterion.cap}
              onChange={e => onUpdate({ cap: parseFloat(e.target.value) || 0 })}
              className="input w-full text-right"
            />
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ai-noir70)', minWidth: '60px' }}>
              {ind?.unit ?? ''}
            </span>
          </div>
          {ind && (
            <p className="text-xs mt-1" style={{ color: 'var(--ai-noir70)' }}>
              {ind.direction === 'lower'
                ? `Score = 0 when ≥ ${criterion.cap} ${ind.unit}`
                : `Full score when ≥ ${criterion.cap} ${ind.unit}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Parameters() {
  const {
    params, setParam, setUnitCost, setScoreCriterion,
    setSavingsRate, resetSavingsMatrix, notify,
  } = useApp();

  const scoreConfig = params.scoreConfig ?? DEFAULT_SCORE_CONFIG;
  const savingsMatrix = params.savingsByTypology ?? buildDefaultSavingsByTypology();

  const reset = () => {
    setParam('exchangeRate', DEFAULT_FINANCIAL_PARAMS.exchangeRate);
    setParam('energyCost',   DEFAULT_FINANCIAL_PARAMS.energyCost);
    MEASURE_KEYS_EE.forEach(k => setUnitCost(k, DEFAULT_FINANCIAL_PARAMS.unitCosts[k] ?? 0));
    setParam('scoreConfig', DEFAULT_SCORE_CONFIG.map(c => ({ ...c })));
    resetSavingsMatrix();
    notify('success', 'Parameters reset to programme defaults.');
  };

  const weightsTotal = scoreConfig.reduce((s, c) => s + (c.max || 0), 0);

  return (
    <div className="space-y-6 fade-in" style={{ maxWidth: '1024px' }}>

      {/* Info banner */}
      <div className="ai-box-info flex items-start gap-3 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-violet)' }} />
        <span>
          All parameters apply globally to every building calculation.
          Unit costs (JOD/m²) serve as defaults in the Calculator.
        </span>
      </div>

      {/* Currency & financial params */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
            <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
            Currency &amp; Financial Parameters
          </h3>
          <button onClick={reset} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reset all
          </button>
        </div>

        {/* Currency toggle */}
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--ai-violet)' }}>Display currency</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>Switches between Jordanian Dinar and Euro for all amounts</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--ai-gris)' }}>
            {['JOD', 'EUR'].map(c => (
              <button
                key={c}
                onClick={() => setParam('currency', c)}
                className="px-5 py-1.5 rounded text-sm font-bold transition-all"
                style={
                  params.currency === c
                    ? { background: 'var(--ai-rouge)', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }
                    : { background: 'transparent', color: 'var(--ai-violet)' }
                }
              >
                {c === 'JOD' ? '🇯🇴 JOD' : '🇪🇺 EUR'}
              </button>
            ))}
          </div>
        </div>

        <ParamRow
          label="Exchange rate"
          hint="1 JOD = X EUR — used to convert all displayed amounts to euros"
          value={params.exchangeRate}
          onChange={v => setParam('exchangeRate', v)}
          min={0.5} max={3} step={0.01} unit="EUR / JOD"
        />
        <ParamRow
          label="Energy cost"
          hint="Average electricity tariff for Jordanian public buildings"
          value={params.energyCost}
          onChange={v => setParam('energyCost', v)}
          min={0.01} max={1} step={0.001} unit="JOD / kWh"
        />
      </div>

      {/* Unit costs (EE measures only — GR costs come from typology defaults) */}
      <div className="card">
        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--ai-violet)' }}>Default unit costs (JOD / m²)</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
          Installed cost per m² of floor area for each EE measure. Can be overridden at the individual building level.
        </p>
        {MEASURE_KEYS_EE.map(key => (
          <ParamRow
            key={key}
            label={MEASURE_META[key].label}
            value={params.unitCosts[key] ?? 0}
            onChange={v => setUnitCost(key, v)}
            min={0} max={5000} step={1} unit="JOD / m²"
          />
        ))}
      </div>

      {/* ── Score Configuration ─────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
            <Target className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
            Score Configuration (0–100)
          </h3>
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{
              background: weightsTotal === 100 ? 'var(--ai-rouge)' : 'var(--ai-rouge-clair)',
              color:       weightsTotal === 100 ? 'white' : 'var(--ai-rouge)',
            }}
          >
            Total: {weightsTotal} / 100
          </span>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
          Choose any indicator from the platform for each scoring slot.
          Max points should sum to 100. The cap value is the threshold where a building
          achieves the maximum (or minimum, for lower-is-better indicators) score on that criterion.
        </p>

        {weightsTotal !== 100 && (
          <div className="ai-box-soft flex items-start gap-2 text-xs mb-4">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
            Max points should sum to 100 for a clean 0–100 score. Current total: {weightsTotal}.
          </div>
        )}

        {scoreConfig.map((criterion, i) => (
          <ScoreCriterionRow
            key={i}
            index={i}
            criterion={criterion}
            onUpdate={(patch) => setScoreCriterion(i, patch)}
          />
        ))}
      </div>

      {/* ── Savings rate by typology × measure ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
            <Building2 className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
            Savings Rate by Building Typology
          </h3>
          <button onClick={resetSavingsMatrix} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reset matrix
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
          Expected energy-saving rate (%) for each EE measure depending on the building typology.
          Example: solar thermal hot water has a larger impact on hospitals than on schools.
          These rates override the per-measure defaults when a building calculation runs.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--ai-violet)' }}>
                <th className="th" style={{ color: 'white', position: 'sticky', left: 0, background: 'var(--ai-violet)', minWidth: 120 }}>
                  Typology
                </th>
                {MEASURE_KEYS_EE.map(k => (
                  <th key={k} className="th"
                    style={{ color: 'white', textAlign: 'center', minWidth: 90, whiteSpace: 'nowrap' }}
                    title={MEASURE_META[k].label}>
                    {MEASURE_META[k].short ?? MEASURE_META[k].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(TYPOLOGY_DEFAULTS).map((typ, rowIdx) => (
                <tr key={typ} style={{ background: rowIdx % 2 === 0 ? 'white' : 'var(--ai-gris-clair)' }}>
                  <td className="td font-semibold"
                    style={{ color: 'var(--ai-violet)', position: 'sticky', left: 0, background: rowIdx % 2 === 0 ? 'white' : 'var(--ai-gris-clair)' }}>
                    {typ}
                  </td>
                  {MEASURE_KEYS_EE.map(k => {
                    const rate = savingsMatrix?.[typ]?.[k] ?? 0;
                    return (
                      <td key={k} className="td" style={{ textAlign: 'center', padding: '4px 6px' }}>
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number" min={0} max={95} step={1}
                            value={+(rate * 100).toFixed(1)}
                            onChange={e =>
                              setSavingsRate(typ, k, (parseFloat(e.target.value) || 0) / 100)
                            }
                            className="input text-xs text-right py-1"
                            style={{ width: 56 }}
                          />
                          <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PEEB tier reference table */}
      <div className="card">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ai-violet)' }}>PEEB Grant Tiers (reference)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--ai-violet)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white">Primary energy gain</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white">PEEB grant rate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white">Tier</th>
              </tr>
            </thead>
            <tbody>
              {[
                { gain: '< 30%',  rate: '0%',  label: 'Below threshold',    bg: 'var(--ai-gris-clair)' },
                { gain: '30–35%', rate: '50%', label: 'Tier 1',             bg: 'white' },
                { gain: '35–40%', rate: '60%', label: 'Tier 2',             bg: 'var(--ai-gris-clair)' },
                { gain: '40–45%', rate: '70%', label: 'Tier 3',             bg: 'white' },
                { gain: '≥ 45%',  rate: '80%', label: 'Tier 4',             bg: 'var(--ai-rouge-clair)' },
              ].map(r => (
                <tr key={r.gain} style={{ background: r.bg, borderBottom: '1px solid var(--ai-gris)' }}>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--ai-violet)' }}>{r.gain}</td>
                  <td className="px-4 py-2 text-right font-black" style={{ color: 'var(--ai-rouge)' }}>{r.rate}</td>
                  <td className="px-4 py-2 text-sm" style={{ color: 'var(--ai-noir70)' }}>{r.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
          Rates apply to the EE capex total. Thermal synergy adjusts HVAC measure only.
          AFD loan and national budget are deducted before net cost calculation.
        </p>
      </div>
    </div>
  );
}
