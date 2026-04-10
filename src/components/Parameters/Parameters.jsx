import { SlidersHorizontal, RefreshCw, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MEASURE_META, MEASURE_KEYS } from '../../engine/CalculationEngine';

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

const DEFAULT_PARAMS = {
  exchangeRate: 1.36,
  energyCost:   0.085,
  unitCosts: { insulation: 25, windows: 80, hvac: 130, lighting: 20, pv: 150, globalRenovation: 260 },
};

export default function Parameters() {
  const { params, setParam, setUnitCost, notify } = useApp();

  const reset = () => {
    setParam('exchangeRate', DEFAULT_PARAMS.exchangeRate);
    setParam('energyCost',   DEFAULT_PARAMS.energyCost);
    MEASURE_KEYS.forEach(k => setUnitCost(k, DEFAULT_PARAMS.unitCosts[k]));
    notify('success', 'Paramètres réinitialisés aux valeurs par défaut du programme.');
  };

  return (
    <div className="space-y-6 fade-in" style={{ maxWidth: '760px' }}>

      {/* Bandeau info */}
      <div className="ai-box-info flex items-start gap-3 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-violet)' }} />
        <span>
          Tous les paramètres s'appliquent globalement à chaque calcul de bâtiment.
          Les coûts unitaires (JOD/m²) servent de valeur par défaut pour le Calculateur.
        </span>
      </div>

      {/* Monnaie & taux */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
            <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
            Monnaie & paramètres financiers
          </h3>
          <button onClick={reset} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        </div>

        {/* Toggle devise */}
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--ai-violet)' }}>Devise d'affichage</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>Bascule entre le Dinar jordanien et l'Euro pour tous les montants</p>
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
          label="Taux de change"
          hint="1 JOD = X EUR — pour convertir tous les montants affichés en euros"
          value={params.exchangeRate}
          onChange={v => setParam('exchangeRate', v)}
          min={0.5} max={3} step={0.01} unit="EUR / JOD"
        />
        <ParamRow
          label="Coût de l'énergie"
          hint="Tarif moyen de l'électricité pour les bâtiments publics jordaniens"
          value={params.energyCost}
          onChange={v => setParam('energyCost', v)}
          min={0.01} max={1} step={0.001} unit="JOD / kWh"
        />
      </div>

      {/* Coûts unitaires */}
      <div className="card">
        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--ai-violet)' }}>Coûts unitaires par défaut (JOD / m²)</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
          Coûts installés par m² de surface de plancher. Modifiables au niveau de chaque fiche bâtiment.
        </p>
        {MEASURE_KEYS.map(key => (
          <ParamRow
            key={key}
            label={MEASURE_META[key].label}
            value={params.unitCosts[key]}
            onChange={v => setUnitCost(key, v)}
            min={0} max={5000} step={1} unit="JOD / m²"
          />
        ))}
      </div>

      {/* Tableau des paliers PEEB */}
      <div className="card">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ai-violet)' }}>Paliers de subvention PEEB (référence)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--ai-violet)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white">Gain énergie primaire</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white">Taux subvention PEEB</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white">Palier</th>
              </tr>
            </thead>
            <tbody>
              {[
                { gain: '< 30%',  rate: '0%',  label: 'Sous le seuil',    bg: 'var(--ai-gris-clair)' },
                { gain: '30–35%', rate: '50%', label: 'Palier 1',         bg: 'white' },
                { gain: '35–40%', rate: '60%', label: 'Palier 2',         bg: 'var(--ai-gris-clair)' },
                { gain: '40–45%', rate: '70%', label: 'Palier 3',         bg: 'white' },
                { gain: '≥ 45%',  rate: '80%', label: 'Palier 4',         bg: 'var(--ai-rouge-clair)' },
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
          Les taux s'appliquent au capex total. La synergie thermique ajuste uniquement la mesure HVAC.
          Le prêt AFD et le budget national sont déduits avant le calcul du coût net.
        </p>
      </div>
    </div>
  );
}
