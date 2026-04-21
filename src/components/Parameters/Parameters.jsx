import { useState } from 'react';
import {
  SlidersHorizontal, RefreshCw, Info, Target,
  TrendingUp, TrendingDown, Building2, Banknote, Zap, Calculator,
  Plus, Trash2, Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MEASURE_META, MEASURE_KEYS, MEASURE_KEYS_EE,
  DEFAULT_SCORE_CONFIG, SCORE_INDICATORS, TYPOLOGY_DEFAULTS,
  buildDefaultSavingsByTypology,
  BUDGET_BASE_ITEMS, DEFAULT_BUDGET_CONFIG, computeBudgetBreakdown,
  formatCurrency,
} from '../../engine/CalculationEngine';

// ─── Shared row component ─────────────────────────────────────────────────────
function ParamRow({ label, value, onChange, min, max, step, unit, hint, extra }) {
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
        {extra && <span className="text-xs ml-2" style={{ color: 'var(--ai-noir70)', minWidth: 90 }}>{extra}</span>}
      </div>
    </div>
  );
}

// ─── Defaults for the reset button ────────────────────────────────────────────
const DEFAULT_FINANCIAL_PARAMS = {
  exchangeRate: 1.36,
  energyCost:   0.085,
  unitCosts: {
    insulation: 25, windows: 80, hvac: 130, lighting: 20, pv: 150, solarThermal: 120,
    structure: 130, accessibility: 70, hygieneAndSecurity: 60,
  },
};

const SLOT_COLORS = ['var(--ai-rouge)', 'var(--ai-violet)', '#22a05a', '#d97706', '#3b82f6'];

const INDICATOR_OPTIONS = Object.entries(SCORE_INDICATORS).map(([key, ind]) => ({
  key, label: ind.label, unit: ind.unit, direction: ind.direction,
}));

// ═════════════════════════════════════════════════════════════════════════════
//  SCORE SLOT
// ═════════════════════════════════════════════════════════════════════════════
function ScoreCriterionRow({ index, criterion, onUpdate, striped }) {
  const ind = SCORE_INDICATORS[criterion.indicator];
  const slotColor = SLOT_COLORS[index % SLOT_COLORS.length];

  const handleIndicatorChange = (newKey) => {
    const newInd = SCORE_INDICATORS[newKey];
    onUpdate({ indicator: newKey, cap: newInd?.defaultCap ?? 100 });
  };

  return (
    <tr style={{ background: striped ? 'var(--ai-gris-clair)' : 'white' }}>
      <td className="td" style={{ width: 60 }}>
        <span
          className="text-xs font-black px-1.5 py-0.5 rounded"
          style={{ background: slotColor, color: 'white', display: 'inline-block', minWidth: 32, textAlign: 'center' }}
        >
          {index + 1}
        </span>
      </td>
      <td className="td">
        <select
          value={criterion.indicator}
          onChange={e => handleIndicatorChange(e.target.value)}
          className="input text-xs py-1"
          style={{ color: 'var(--ai-violet)', fontWeight: 600, width: '100%' }}
        >
          {INDICATOR_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>
              {opt.label} ({opt.unit})
            </option>
          ))}
        </select>
      </td>
      <td className="td" style={{ width: 110 }}>
        {ind && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: ind.direction === 'higher' ? '#dcfce7' : '#fef3c7',
              color:       ind.direction === 'higher' ? '#16a34a' : '#d97706',
            }}
            title={ind.direction === 'higher' ? 'Higher = better' : 'Lower = better'}
          >
            {ind.direction === 'higher'
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {ind.direction === 'higher' ? 'Higher' : 'Lower'}
          </span>
        )}
      </td>
      <td className="td" style={{ width: 110 }}>
        <div className="inline-flex items-center gap-1 justify-end">
          <input
            type="number" min={0} max={100} step={1}
            value={criterion.max}
            onChange={e => onUpdate({ max: parseFloat(e.target.value) || 0 })}
            className="input text-xs py-1 text-right"
            style={{ width: 56 }}
          />
          <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>pts</span>
        </div>
      </td>
      <td className="td" style={{ width: 170 }}>
        <div className="inline-flex items-center gap-1 justify-end">
          <input
            type="number" min={0} step="any"
            value={criterion.cap}
            onChange={e => onUpdate({ cap: parseFloat(e.target.value) || 0 })}
            className="input text-xs py-1 text-right"
            style={{ width: 72 }}
            title={
              ind?.direction === 'lower'
                ? `Score = 0 when ≥ ${criterion.cap} ${ind.unit}`
                : ind
                  ? `Full score when ≥ ${criterion.cap} ${ind.unit}`
                  : ''
            }
          />
          <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>{ind?.unit ?? ''}</span>
        </div>
      </td>
    </tr>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  BUDGET SECTION
// ═════════════════════════════════════════════════════════════════════════════
function BudgetSection({ params, buildings }) {
  const { setBudgetItem, addBudgetItem, deleteBudgetItem, setBudgetContingency } = useApp();
  const cfg = params.budgetConfig ?? DEFAULT_BUDGET_CONFIG;
  const { currency, exchangeRate } = params;

  // Preview uses the actual portfolio (PEEB-targeted buildings) works totals
  const targeted = buildings.filter(b => b.peebSelected === true && !b.eligibility.ineligible);
  const toDisp = jod => currency === 'EUR' ? +(jod * exchangeRate).toFixed(0) : jod;
  const baseAmounts = {
    ee_works: toDisp(targeted.reduce((s, b) => s + (b.calc?._jod?.eeCapex || 0), 0)),
    gr_works: toDisp(targeted.reduce((s, b) => s + (b.calc?._jod?.grCapex || 0), 0)),
  };
  const breakdown = computeBudgetBreakdown(baseAmounts, cfg);
  const fmt = amt => formatCurrency(amt, currency, true);

  // All ids available for the "applies to" dropdown when editing an item at index i
  const idsUpTo = (index) => [
    ...BUDGET_BASE_ITEMS.map(b => ({ id: b.id, label: b.label })),
    ...cfg.items.slice(0, index).map(it => ({ id: it.id, label: it.label })),
  ];

  const handleAdd = () => {
    const newItem = {
      id: `item_${Date.now()}`,
      label: 'New budget item',
      type: 'percent',
      value: 5,
      appliesTo: ['ee_works', 'gr_works'],
    };
    addBudgetItem(newItem);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
          <Calculator className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
          Budget composition
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
          Define the budget line items that build on top of EE and other refurbishment works.
          Each item can be a fixed amount or a percentage applied to the items of your choice.
          &ldquo;Contingency on project&rdquo; is reserved — it always applies to every other item.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--ai-violet)' }}>
                <th className="th" style={{ color: 'white' }}>Item</th>
                <th className="th" style={{ color: 'white', width: 120 }}>Type</th>
                <th className="th" style={{ color: 'white', width: 120, textAlign: 'right' }}>Value</th>
                <th className="th" style={{ color: 'white' }}>Applies to</th>
                <th className="th" style={{ color: 'white', textAlign: 'right' }}>Preview amount</th>
                <th className="th" style={{ color: 'white', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {/* Base items — read-only, always shown */}
              {BUDGET_BASE_ITEMS.map((b, i) => {
                const row = breakdown.rows.find(r => r.id === b.id);
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--ai-gris-clair)' }}>
                    <td className="td font-semibold" style={{ color: 'var(--ai-violet)' }}>
                      {b.label}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--ai-noir70)' }}>(auto)</span>
                    </td>
                    <td className="td text-xs" style={{ color: 'var(--ai-noir70)' }}>from buildings</td>
                    <td className="td text-right text-xs" style={{ color: 'var(--ai-noir70)' }}>—</td>
                    <td className="td text-xs" style={{ color: 'var(--ai-noir70)' }}>—</td>
                    <td className="td text-right font-semibold" style={{ color: 'var(--ai-violet)' }}>
                      {fmt(row?.amount ?? 0)}
                    </td>
                    <td className="td"></td>
                  </tr>
                );
              })}

              {/* User-defined items */}
              {cfg.items.map((item, idx) => {
                const row = breakdown.rows.find(r => r.id === item.id);
                const avail = idsUpTo(idx);
                const rowBg = (BUDGET_BASE_ITEMS.length + idx) % 2 === 0 ? 'white' : 'var(--ai-gris-clair)';
                return (
                  <tr key={item.id} style={{ background: rowBg }}>
                    <td className="td">
                      <input
                        type="text" value={item.label}
                        onChange={e => setBudgetItem(idx, { label: e.target.value })}
                        className="input text-sm py-1"
                        style={{ width: '100%', fontWeight: 600, color: 'var(--ai-violet)' }}
                      />
                    </td>
                    <td className="td">
                      <select
                        value={item.type}
                        onChange={e => setBudgetItem(idx, { type: e.target.value })}
                        className="input text-xs py-1"
                      >
                        <option value="percent">Percent (%)</option>
                        <option value="absolute">Absolute</option>
                      </select>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="number" min={0} step={item.type === 'percent' ? 0.1 : 1}
                          value={item.value}
                          onChange={e => setBudgetItem(idx, { value: parseFloat(e.target.value) || 0 })}
                          className="input text-xs py-1 text-right"
                          style={{ width: 80 }}
                        />
                        <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
                          {item.type === 'percent' ? '%' : currency}
                        </span>
                      </div>
                    </td>
                    <td className="td">
                      {item.type === 'percent' ? (
                        <div className="flex flex-wrap gap-1">
                          {avail.map(a => {
                            const on = (item.appliesTo ?? []).includes(a.id);
                            return (
                              <button
                                key={a.id}
                                onClick={() => {
                                  const current = new Set(item.appliesTo ?? []);
                                  if (on) current.delete(a.id); else current.add(a.id);
                                  setBudgetItem(idx, { appliesTo: [...current] });
                                }}
                                className="text-xs px-2 py-0.5 rounded-full transition-all"
                                style={{
                                  background: on ? 'var(--ai-rouge)' : 'white',
                                  color: on ? 'white' : 'var(--ai-noir70)',
                                  border: `1px solid ${on ? 'var(--ai-rouge)' : 'var(--ai-gris)'}`,
                                }}
                              >
                                {a.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>—</span>
                      )}
                    </td>
                    <td className="td text-right font-semibold" style={{ color: 'var(--ai-violet)' }}>
                      {fmt(row?.amount ?? 0)}
                    </td>
                    <td className="td text-center">
                      <button
                        onClick={() => deleteBudgetItem(idx)}
                        className="p-1 rounded hover:bg-red-50"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--ai-rouge)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Contingency on project (locked, applies to all) */}
              {(() => {
                const cp = cfg.contingencyProject ?? DEFAULT_BUDGET_CONFIG.contingencyProject;
                const cpRow = breakdown.rows.find(r => r.id === 'contingency_project');
                return (
                  <tr style={{ background: 'var(--ai-rouge-clair)' }}>
                    <td className="td font-bold" style={{ color: 'var(--ai-rouge)' }}>
                      <Lock className="w-3 h-3 inline mr-1" />
                      {cp.label ?? 'Contingency on project'}
                    </td>
                    <td className="td text-xs" style={{ color: 'var(--ai-noir70)' }}>Percent (%)</td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="number" min={0} step={0.1}
                          value={cp.value ?? 0}
                          onChange={e => setBudgetContingency({ value: parseFloat(e.target.value) || 0 })}
                          className="input text-xs py-1 text-right"
                          style={{ width: 80 }}
                        />
                        <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
                      </div>
                    </td>
                    <td className="td text-xs italic" style={{ color: 'var(--ai-noir70)' }}>
                      All items above (locked)
                    </td>
                    <td className="td text-right font-bold" style={{ color: 'var(--ai-rouge)' }}>
                      {fmt(cpRow?.amount ?? 0)}
                    </td>
                    <td className="td"></td>
                  </tr>
                );
              })()}

              {/* Total row */}
              <tr style={{ background: 'var(--ai-violet)' }}>
                <td className="td font-black text-white" colSpan={4}>Total project budget</td>
                <td className="td text-right font-black text-white">{fmt(breakdown.total)}</td>
                <td className="td"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button onClick={handleAdd} className="btn-secondary text-xs mt-4">
          <Plus className="w-3.5 h-3.5" /> Add budget item
        </button>

        <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
          Preview amounts are computed against the PEEB-targeted buildings portfolio.
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN PARAMETERS COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'currency', label: 'Currency & Financial', icon: SlidersHorizontal },
  { id: 'costs',    label: 'Cost estimations',     icon: Banknote },
  { id: 'energy',   label: 'Energy efficiency',    icon: Zap },
  { id: 'budget',   label: 'Budget',               icon: Calculator },
  { id: 'score',    label: 'Score configuration',  icon: Target },
];

export default function Parameters() {
  const {
    params, buildings, setParam, setUnitCost, setScoreCriterion,
    setSavingsRate, resetSavingsMatrix, notify,
  } = useApp();
  const [activeTab, setActiveTab] = useState('currency');

  const scoreConfig = params.scoreConfig ?? DEFAULT_SCORE_CONFIG;
  const savingsMatrix = params.savingsByTypology ?? buildDefaultSavingsByTypology();

  const reset = () => {
    setParam('exchangeRate', DEFAULT_FINANCIAL_PARAMS.exchangeRate);
    setParam('energyCost',   DEFAULT_FINANCIAL_PARAMS.energyCost);
    MEASURE_KEYS.forEach(k => setUnitCost(k, DEFAULT_FINANCIAL_PARAMS.unitCosts[k] ?? 0));
    setParam('scoreConfig', DEFAULT_SCORE_CONFIG.map(c => ({ ...c })));
    resetSavingsMatrix();
    notify('success', 'Parameters reset to programme defaults.');
  };

  const weightsTotal = scoreConfig.reduce((s, c) => s + (c.max || 0), 0);
  const rate = params.exchangeRate || 1.36;

  return (
    <div className="space-y-5 fade-in" style={{ maxWidth: '1100px' }}>

      {/* Info banner */}
      <div className="ai-box-info flex items-start gap-3 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-violet)' }} />
        <span>All parameters apply globally to every building calculation.</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: '1px solid var(--ai-gris)' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all rounded-t-lg"
              style={{
                background: on ? 'white' : 'transparent',
                color: on ? 'var(--ai-rouge)' : 'var(--ai-noir70)',
                borderBottom: on ? '3px solid var(--ai-rouge)' : '3px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ─── Currency & financial parameters ───────────────────────────── */}
      {activeTab === 'currency' && (
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
      )}

      {/* ─── Cost estimations ──────────────────────────────────────────── */}
      {activeTab === 'costs' && (
        <div className="card">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
            <Banknote className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
            Default unit costs (JOD / m²)
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
            Installed cost per m² of floor area for each renovation measure.
            Can be overridden at the individual building level.
          </p>
          {MEASURE_KEYS.map(key => {
            const v = params.unitCosts[key] ?? 0;
            const eur = (v * rate).toFixed(1);
            return (
              <ParamRow
                key={key}
                label={MEASURE_META[key].label}
                value={v}
                onChange={val => setUnitCost(key, val)}
                min={0} max={5000} step={1} unit="JOD / m²"
                extra={`≈ € ${eur} / m²`}
              />
            );
          })}
        </div>
      )}

      {/* ─── Energy efficiency — savings by typology ───────────────────── */}
      {activeTab === 'energy' && (
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
                      const r = savingsMatrix?.[typ]?.[k] ?? 0;
                      return (
                        <td key={k} className="td" style={{ textAlign: 'center', padding: '4px 6px' }}>
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number" min={0} max={95} step={1}
                              value={+(r * 100).toFixed(1)}
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
      )}

      {/* ─── Budget ───────────────────────────────────────────────────── */}
      {activeTab === 'budget' && <BudgetSection params={params} buildings={buildings} />}

      {/* ─── Score configuration ──────────────────────────────────────── */}
      {activeTab === 'score' && (
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

          <p className="text-xs mb-3" style={{ color: 'var(--ai-noir70)' }}>
            Choose any indicator for each scoring slot. Max points should sum to 100.
          </p>

          {weightsTotal !== 100 && (
            <div className="ai-box-soft flex items-start gap-2 text-xs mb-3">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
              Max points should sum to 100 for a clean 0–100 score. Current total: {weightsTotal}.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: 'var(--ai-violet)' }}>
                  <th className="th" style={{ color: 'white', width: 60 }}>Slot</th>
                  <th className="th" style={{ color: 'white' }}>Indicator</th>
                  <th className="th" style={{ color: 'white', width: 110 }}>Direction</th>
                  <th className="th" style={{ color: 'white', width: 110, textAlign: 'right' }}>Max points</th>
                  <th className="th" style={{ color: 'white', width: 170, textAlign: 'right' }}>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {scoreConfig.map((criterion, i) => (
                  <ScoreCriterionRow
                    key={i}
                    index={i}
                    criterion={criterion}
                    onUpdate={(patch) => setScoreCriterion(i, patch)}
                    striped={i % 2 === 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
