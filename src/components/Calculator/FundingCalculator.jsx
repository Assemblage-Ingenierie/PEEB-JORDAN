import { useState, useMemo } from 'react';
import {
  Calculator, Leaf, Banknote, Zap, TrendingUp,
  RotateCcw, ChevronDown, CheckCircle2, Info, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateBuilding, MEASURE_META, MEASURE_KEYS_EE, MEASURE_KEYS_GR,
  TYPOLOGY_DEFAULTS, FUNDING_TIERS, formatCurrency,
} from '../../engine/CalculationEngine';

// ─── Palettes Assemblage ─────────────────────────────────────────────────────
const TIER_BG = { slate:'var(--ai-violet)', amber:'var(--ai-gris)', blue:'var(--ai-rouge-clair)', green:'var(--ai-rouge)', purple:'var(--ai-violet)' };
const TIER_FG = { slate:'white', amber:'var(--ai-violet)', blue:'var(--ai-violet)', green:'white', purple:'white' };

// ─── Jauge ────────────────────────────────────────────────────────────────────
function GaugeBar({ value }) {
  const pct = Math.min(value, 60);
  return (
    <div className="mt-3">
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.2)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(pct / 60) * 100}%`, background: 'rgba(255,255,255,.85)' }} />
        {[30, 35, 40, 45].map(v => (
          <div key={v} className="absolute top-0 h-full w-px"
            style={{ left: `${(v / 60) * 100}%`, background: 'rgba(255,255,255,.4)' }} />
        ))}
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ opacity:.65 }}>
        <span>0%</span><span>30</span><span>35</span><span>40</span><span>45</span><span>60%+</span>
      </div>
    </div>
  );
}

// ─── Ligne de mesure ──────────────────────────────────────────────────────────
function CalcMeasureRow({ mKey, measure, synApplied, onChange, onToggle }) {
  const meta   = MEASURE_META[mKey];
  const synergy = synApplied && mKey === 'hvac';
  const locked  = meta.lockSavings;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        border:     `1px solid ${measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'var(--ai-gris)'}`,
        background: measure.selected ? (locked ? 'rgba(48,50,62,.06)' : 'var(--ai-rouge-clair)') : 'white',
      }}>
      <button onClick={onToggle}
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          background: measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'white',
          border: measure.selected ? 'none' : '2px solid var(--ai-gris)',
        }}>
        {measure.selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </button>

      <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--ai-violet)' }}>
        {meta.label}
        {synergy && (
          <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--ai-rouge)', color: 'white' }}>✦ Synergie</span>
        )}
      </span>

      <input type="number" min="0" step="1" value={measure.capex}
        onChange={e => onChange('capex', parseFloat(e.target.value) || 0)}
        className="w-20 input text-xs text-right py-1" title="Capex JOD/m²" />
      <span className="text-xs w-14" style={{ color: 'var(--ai-noir70)' }}>JOD/m²</span>

      {/* Taux d'économie — verrouillé à 0% pour GR */}
      {locked ? (
        <div className="flex items-center gap-1">
          <span className="w-14 text-xs text-right py-1 px-2 rounded select-none"
            style={{ background: 'var(--ai-gris)', color: 'var(--ai-noir70)', border: '1px solid var(--ai-gris)' }}>
            0
          </span>
          <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
        </div>
      ) : (
        <>
          <input type="number" min="0" max="99" step="1"
            value={+(measure.savingsRate * 100).toFixed(1)}
            onChange={e => onChange('savingsRate', (parseFloat(e.target.value) || 0) / 100)}
            className="w-14 input text-xs text-right py-1" />
          <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
        </>
      )}
    </div>
  );
}

// ─── Calculateur principal ────────────────────────────────────────────────────
export default function FundingCalculator() {
  const { params } = useApp();

  // ── Building params (sans AFD / national) ──
  const [typology, setTypology] = useState('School');
  const [area, setArea]         = useState(3000);
  const [eui, setEui]           = useState(TYPOLOGY_DEFAULTS['School'].baselineEUI);

  // ── Funding sources (section séparée) ──
  const [afdLoan,    setAfdLoan]    = useState(0);
  const [natBudget,  setNatBudget]  = useState(0);
  const [othersVal,  setOthers]     = useState(0);

  const [measures, setMeasures] = useState(() => {
    const def = TYPOLOGY_DEFAULTS['School'];
    return Object.fromEntries(
      [...MEASURE_KEYS_EE, ...MEASURE_KEYS_GR].map(k => [
        k, { selected: false, capex: def[k].capex, savingsRate: def[k].savingsRate }
      ])
    );
  });

  const handleTypology = (t) => {
    setTypology(t);
    const def = TYPOLOGY_DEFAULTS[t];
    if (def) {
      setEui(def.baselineEUI);
      setMeasures(Object.fromEntries(
        [...MEASURE_KEYS_EE, ...MEASURE_KEYS_GR].map(k => [
          k, { selected: false, capex: def[k].capex, savingsRate: def[k].savingsRate }
        ])
      ));
    }
  };

  const toggleMeasure = (key) => setMeasures(m => ({ ...m, [key]: { ...m[key], selected: !m[key].selected } }));
  const setField      = (key, f, v) => setMeasures(m => ({ ...m, [key]: { ...m[key], [f]: v } }));
  const reset         = () => { handleTypology(typology); setAfdLoan(0); setNatBudget(0); setOthers(0); };

  const result = useMemo(() => {
    if (!area || !eui) return null;
    return calculateBuilding({
      building: { area, baselineEUI: eui, typology },
      measures,
      params: { ...params, afdLoan, nationalBudget: natBudget, others: othersVal },
    });
  }, [area, eui, typology, measures, params, afdLoan, natBudget, othersVal]);

  const { currency } = params;
  const tierBg = result ? TIER_BG[result.tier.color] : 'var(--ai-violet)';
  const tierFg = result ? TIER_FG[result.tier.color] : 'white';

  return (
    <div className="space-y-6 fade-in">
      <div className="ai-box-info flex items-start gap-3 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-violet)' }} />
        <span>
          Outil de simulation standalone. Le capex EE est séparé du capex Réhabilitation globale.
          La subvention PEEB s'applique au capex EE uniquement.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Paramètres bâtiment + mesures ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Paramètres bâtiment — sans AFD / national */}
          <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
              <Calculator className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} /> Paramètres bâtiment
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Typologie</label>
                <div className="relative">
                  <select value={typology} onChange={e => handleTypology(e.target.value)} className="input appearance-none pr-8">
                    {Object.keys(TYPOLOGY_DEFAULTS).map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--ai-noir70)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Surface (m²)</label>
                  <input type="number" min="100" max="100000" step="100" value={area}
                    onChange={e => setArea(parseFloat(e.target.value) || 0)} className="input" />
                </div>
                <div>
                  <label className="label">EUI référence (kWh/m²/an)</label>
                  <input type="number" min="10" max="500" step="5" value={eui}
                    onChange={e => setEui(parseFloat(e.target.value) || 0)} className="input" />
                </div>
              </div>
            </div>
          </div>

          {/* Mesures EE */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--ai-violet)' }}>Efficacité énergétique</h3>
              <button onClick={reset} className="btn-secondary text-xs">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
            <div className="space-y-2">
              {MEASURE_KEYS_EE.map(key => (
                <CalcMeasureRow key={key} mKey={key} measure={measures[key]}
                  synApplied={result?.synergyApplied}
                  onToggle={() => toggleMeasure(key)}
                  onChange={(f, v) => setField(key, f, v)} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              ✦ Isolation ou Fenêtres → Synergie thermique : HVAC capex −20%, efficacité +15%.
            </p>
          </div>

          {/* Mesures Réhabilitation globale */}
          <div className="card">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ai-violet)' }} />
              Réhabilitation globale
            </h3>
            <div className="space-y-2">
              {MEASURE_KEYS_GR.map(key => (
                <CalcMeasureRow key={key} mKey={key} measure={measures[key]}
                  synApplied={false}
                  onToggle={() => toggleMeasure(key)}
                  onChange={(f, v) => setField(key, f, v)} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              Ces travaux n'améliorent pas le gain EE (0%). Ils peuvent être couverts par le Prêt AFD (parties non-EE).
            </p>
          </div>
        </div>

        {/* ── Résultats ── */}
        <div className="xl:col-span-3 space-y-4">
          {result ? (<>

            {/* Hero palier */}
            <div className="rounded-2xl p-6 fade-in" style={{ background: tierBg, color: tierFg }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ opacity:.75 }}>Palier PEEB</p>
                  <p className="text-2xl font-black mt-1">{result.tier.label}</p>
                  <p className="text-xs mt-1" style={{ opacity:.6 }}>Subvention sur capex EE uniquement</p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black leading-none">{result.energyGain.toFixed(1)}%</p>
                  <p className="text-xs mt-1" style={{ opacity:.7 }}>Gain énergie primaire</p>
                </div>
              </div>
              <GaugeBar value={result.energyGain} />
            </div>

            {result.synergyApplied && (
              <div className="ai-box-soft flex items-center gap-2 text-sm fade-in">
                <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                <strong>Synergie thermique active —</strong> HVAC capex −20%, efficacité +15%
              </div>
            )}

            {/* ── Capex EE vs GR ── */}
            <div className="card">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ai-violet)' }}>Capex par catégorie</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--ai-rouge)' }}>Efficacité énergétique</p>
                  <p className="text-xl font-black" style={{ color: 'var(--ai-violet)' }}>{formatCurrency(result.capex.ee.total, currency)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>{formatCurrency(result.capex.ee.perM2, currency)}/m²</p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--ai-rouge)' }}>
                    Subvention PEEB : {formatCurrency(result.peebGrant, currency)}
                  </p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(48,50,62,.07)', border: '1px solid var(--ai-gris)' }}>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--ai-violet)' }}>Réhabilitation globale</p>
                  <p className="text-xl font-black" style={{ color: 'var(--ai-violet)' }}>{formatCurrency(result.capex.gr.total, currency)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>{formatCurrency(result.capex.gr.perM2, currency)}/m²</p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--ai-violet)' }}>
                    Éligible Prêt AFD
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'var(--ai-gris-clair)', border: '1px solid var(--ai-gris)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--ai-violet)' }}>Capex total</span>
                <span className="text-lg font-black" style={{ color: 'var(--ai-violet)' }}>{formatCurrency(result.capex.total, currency)}</span>
              </div>
            </div>

            {/* ── Sources de financement ── */}
            <div className="card">
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ai-violet)', borderBottom: '1px dashed var(--ai-rouge)', paddingBottom: 8 }}>
                Sources de financement ({currency})
              </h3>
              <div className="space-y-3 mb-4">
                {[
                  { label: 'Subvention PEEB (calculée)', value: formatCurrency(result.peebGrant, currency), readOnly: true, rouge: true },
                ].map(({ label, value, readOnly, rouge }) => (
                  <div key={label} className="flex items-center justify-between">
                    <label className="text-sm font-semibold" style={{ color: rouge ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>{label}</label>
                    <span className="font-bold text-sm" style={{ color: rouge ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>{value}</span>
                  </div>
                ))}
                <hr style={{ borderColor: 'var(--ai-gris)' }} />
                {[
                  { label: 'Prêt AFD (parties non-EE)', value: afdLoan, setter: setAfdLoan },
                  { label: 'Budget national',           value: natBudget, setter: setNatBudget },
                  { label: 'Autres',                    value: othersVal, setter: setOthers },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center gap-3">
                    <label className="text-sm flex-1" style={{ color: 'var(--ai-noir70)' }}>{label}</label>
                    <input type="number" min="0" step="10000" value={value}
                      onChange={e => setter(parseFloat(e.target.value) || 0)}
                      className="input w-36 text-right text-sm" />
                  </div>
                ))}
              </div>

              {/* Total financement et coût net */}
              <div className="space-y-2 pt-3" style={{ borderTop: '2px solid var(--ai-rouge)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--ai-noir70)' }}>Total financements</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--ai-violet)' }}>{formatCurrency(result.totalFunding, currency)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: result.netCapex > 0 ? 'var(--ai-rouge-clair)' : 'var(--ai-gris-clair)', border: `1px solid ${result.netCapex > 0 ? 'var(--ai-rouge)' : 'var(--ai-gris)'}` }}>
                  <span className="font-bold text-sm" style={{ color: 'var(--ai-violet)' }}>Coût net porteur de projet</span>
                  <span className="text-lg font-black" style={{ color: result.netCapex > 0 ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
                    {formatCurrency(result.netCapex, currency)}
                  </span>
                </div>
                {result.paybackYears && (
                  <p className="text-xs text-center" style={{ color: 'var(--ai-noir70)' }}>
                    Retour sur investissement : <strong>{result.paybackYears} ans</strong>
                  </p>
                )}
              </div>
            </div>

            {/* ── KPIs énergétiques ── */}
            <div className="card">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ai-violet)' }}>Indicateurs énergétiques & CO₂</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Zap,  label: 'Économies', value: formatCurrency(result.annualSavings, currency) + '/an' },
                  { icon: Zap,  label: 'kWh économisés', value: `${result.energySavedKWh.toLocaleString()} kWh/an` },
                  { icon: Leaf, label: 'CO₂ évité', value: `${result.co2AvoidedTon} tCO₂/an` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="card p-3 space-y-1" style={{ borderTop: '3px solid var(--ai-rouge)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
                    <p className="text-sm font-bold leading-tight" style={{ color: 'var(--ai-violet)' }}>{value}</p>
                    <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Référence paliers PEEB ── */}
            <div className="card">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ai-violet)' }}>Référence paliers PEEB</h3>
              <div className="space-y-1.5">
                {FUNDING_TIERS.map(t => {
                  const active = result.tier.label === t.label;
                  return (
                    <div key={t.label}
                      className="flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                      style={{
                        background: active ? 'var(--ai-rouge-clair)' : 'var(--ai-gris-clair)',
                        border: active ? '1px solid var(--ai-rouge)' : '1px solid transparent',
                      }}>
                      <div className="flex items-center gap-2 text-xs">
                        {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ai-rouge)' }} />}
                        <span style={{ color: 'var(--ai-noir70)' }}>
                          {t.minGain}%{t.maxGain < Infinity ? `–${t.maxGain}%` : '+'} gain
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{ background: TIER_BG[t.color], color: TIER_FG[t.color] }}>
                          {Math.round(t.grantRate * 100)}% subvention
                        </span>
                        {active && <span className="text-xs font-bold" style={{ color: 'var(--ai-rouge)' }}>← actuel</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </>) : (
            <div className="card flex items-center justify-center h-64" style={{ color: 'var(--ai-noir70)' }}>
              <p className="text-sm">Saisissez les paramètres et sélectionnez au moins une mesure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
