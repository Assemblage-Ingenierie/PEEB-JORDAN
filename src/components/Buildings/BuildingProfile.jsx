import { useState, useRef, useEffect } from 'react';
import {
  MapPin, Clock, Calendar, Layers, Ruler, Zap,
  Camera, X, Printer, AlertTriangle, Ban, Info,
  Leaf, Banknote, TrendingUp, Wind, Lightbulb,
  Sun, Building2, Square, CheckCircle2, ShieldCheck, Droplets,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MEASURE_META, MEASURE_KEYS_EE, MEASURE_KEYS_GR, formatCurrency, calculateScore } from '../../engine/CalculationEngine';

// ─── Palette paliers ──────────────────────────────────────────────────────────
const TIER_STYLE = {
  slate:  { bg: 'var(--ai-violet)',      fg: 'white'              },
  amber:  { bg: 'var(--ai-gris)',        fg: 'var(--ai-violet)'   },
  blue:   { bg: 'var(--ai-rouge-clair)', fg: 'var(--ai-violet)'   },
  green:  { bg: 'var(--ai-rouge)',       fg: 'white'              },
  purple: { bg: 'var(--ai-violet)',      fg: 'white'              },
};

// ─── Section ──────────────────────────────────────────────────────────────────
export function Section({ title, children }) {
  return (
    <section className="card">
      <h3 className="text-xs font-bold uppercase tracking-wide mb-4 pb-2"
        style={{ color: 'var(--ai-rouge)', borderBottom: '1px dashed var(--ai-rouge)' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function InfoRow({ label, value, icon: Icon, italic }) {
  return (
    <div className="flex items-start gap-2 text-sm py-1">
      {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />}
      <span className="w-36 flex-shrink-0 text-xs" style={{ color: 'var(--ai-noir70)' }}>{label}</span>
      <span className={`font-medium text-sm flex-1 ${italic ? 'italic' : ''}`}
        style={{ color: italic ? 'var(--ai-noir70)' : 'var(--ai-violet)' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

/** Editable variant — click row to edit, commits on blur/Enter. */
export function EditableInfoRow({ label, icon: Icon, value, onCommit, type = 'text', italic, suffix, options }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = () => {
    setEditing(false);
    const v = type === 'number'
      ? (draft === '' || draft === null ? null : Number(draft))
      : draft;
    if (v !== (value ?? '')) onCommit(v);
  };
  const cancel = () => { setDraft(value ?? ''); setEditing(false); };

  const display = value === null || value === undefined || value === '' ? '—' : value;

  return (
    <div className="flex items-start gap-2 text-sm py-1 group">
      {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />}
      <span className="w-36 flex-shrink-0 text-xs" style={{ color: 'var(--ai-noir70)' }}>{label}</span>
      {editing ? (
        options ? (
          <select autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                  onBlur={commit}
                  className="input text-sm flex-1 py-1">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input autoFocus type={type}
                 value={draft}
                 onChange={e => setDraft(e.target.value)}
                 onBlur={commit}
                 onKeyDown={e => {
                   if (e.key === 'Enter') commit();
                   if (e.key === 'Escape') cancel();
                 }}
                 className="input text-sm flex-1 py-1" />
        )
      ) : (
        <button type="button"
                onClick={() => setEditing(true)}
                className={`flex-1 text-left font-medium text-sm rounded px-1 -mx-1 cursor-text hover:bg-slate-50 ${italic ? 'italic' : ''}`}
                style={{ color: italic ? 'var(--ai-noir70)' : 'var(--ai-violet)' }}
                title="Click to edit">
          {display}{suffix && display !== '—' ? ` ${suffix}` : ''}
        </button>
      )}
    </div>
  );
}

// ─── Mini-carte Leaflet (bâtiment unique) ─────────────────────────────────────
function BuildingMiniMap({ building }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const coords     = building.coordinates;

  useEffect(() => {
    if (!coords || coords.length < 2 || !mapRef.current) return;
    let cancelled = false;

    import('leaflet').then(mod => {
      if (cancelled) return;
      const L = mod.default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }

      const map = L.map(mapRef.current, {
        center: coords, zoom: 14,
        zoomControl: false, dragging: false, scrollWheelZoom: false,
        attributionControl: false,
      });
      leafletRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(map);

      L.circleMarker(coords, {
        radius: 11, fillColor: '#E30513', color: 'white', weight: 3, fillOpacity: 1,
      })
        .bindPopup(`<strong style="color:#30323E;font-family:Open Sans,sans-serif">${building.name}</strong>`)
        .addTo(map)
        .openPopup();
    });

    return () => {
      cancelled = true;
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building.id]);

  if (!coords || coords.length < 2) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--ai-gris-clair)', borderRadius: 8, color: 'var(--ai-noir70)', fontSize: 13 }}>
        Coordinates not available
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} className="no-print"
        style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ai-gris)' }} />
      <div className="print-only"
        style={{ padding: 10, background: 'var(--ai-gris-clair)', borderRadius: 6, fontSize: 10 }}>
        <strong>Location:</strong> {building.address}<br />
        <strong>GPS Coordinates:</strong> {coords.join(', ')}<br />
        <a href={`https://www.openstreetmap.org/?mlat=${coords[0]}&mlon=${coords[1]}&zoom=14`}
          style={{ color: 'var(--ai-rouge)' }}>
          View on OpenStreetMap →
        </a>
      </div>
    </>
  );
}

// ─── Icônes mesures ───────────────────────────────────────────────────────────
const ICON_MAP = { Layers, Square, Wind, Lightbulb, Sun, Droplets, Building2, Accessibility: MapPin, ShieldCheck };

// ─── Ligne de mesure ─────────────────────────────────────────────────────────
export function MeasureRow({ buildingId, measureKey, measure, synApplied }) {
  const { toggleMeasure, setMeasureValue } = useApp();
  const meta    = MEASURE_META[measureKey];
  const Icon    = ICON_MAP[meta.icon] || Layers;
  const synergy = synApplied && measureKey === 'hvac';
  const locked  = meta.lockSavings;

  return (
    <div className="rounded-xl transition-all"
      style={{
        border:     `1px solid ${measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'var(--ai-gris)'}`,
        background: measure.selected ? (locked ? 'rgba(48,50,62,.06)' : 'var(--ai-rouge-clair)') : 'white',
      }}>
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => toggleMeasure(buildingId, measureKey)}
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            background: measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'white',
            border: measure.selected ? 'none' : '2px solid var(--ai-gris)',
          }}>
          {measure.selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </button>

        <Icon className="w-4 h-4 flex-shrink-0"
          style={{ color: measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'var(--ai-noir70)' }} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--ai-violet)' }}>
            {meta.label}
            {synergy && (
              <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--ai-rouge)', color: 'white' }}>✦ Synergy −20%</span>
            )}
            {locked && (
              <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(48,50,62,.1)', color: 'var(--ai-violet)' }}>Global Refurb</span>
            )}
          </p>
        </div>

        <input type="number" min="0" step="1" value={measure.capex}
          onChange={e => setMeasureValue(buildingId, measureKey, 'capex', parseFloat(e.target.value) || 0)}
          className="w-20 input text-xs text-right py-1" title="Capex JOD/m²" />
        <span className="text-xs w-14" style={{ color: 'var(--ai-noir70)' }}>JOD/m²</span>

        {locked ? (
          <div className="flex items-center gap-1">
            <span className="w-14 input text-xs text-right py-1 select-none"
              style={{ background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)', border: '1px solid var(--ai-gris)', borderRadius: 6, padding: '4px 8px', display: 'inline-flex', justifyContent: 'flex-end' }}>
              0
            </span>
            <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
          </div>
        ) : (
          <>
            <input type="number" min="0" max="99" step="1"
              value={+(measure.savingsRate * 100).toFixed(1)}
              onChange={e => setMeasureValue(buildingId, measureKey, 'savingsRate', (parseFloat(e.target.value) || 0) / 100)}
              className="w-14 input text-xs text-right py-1" />
            <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
          </>
        )}
      </div>

      {/* Notes textarea — appears only when the measure is selected */}
      {measure.selected && (
        <div className="px-3 pb-3 fade-in">
          <textarea
            rows={2}
            value={measure.notes ?? ''}
            onChange={e => setMeasureValue(buildingId, measureKey, 'notes', e.target.value)}
            className="input resize-none text-xs leading-snug w-full"
            placeholder={`Precisions about ${meta.short ?? meta.label} — scope, brands, constraints…`}
          />
        </div>
      )}
    </div>
  );
}

// ─── Résultats ────────────────────────────────────────────────────────────────
function ResultsPanel({ calc, params }) {
  if (!calc) return <p className="text-sm" style={{ color: 'var(--ai-noir70)' }}>Select at least one EE measure.</p>;
  const tier = calc.tier;
  const ts   = TIER_STYLE[tier.color] || TIER_STYLE.slate;
  const { currency } = params;

  return (
    <div className="space-y-4 fade-in">
      {/* Tier banner */}
      <div className="flex items-center justify-between p-5 rounded-xl" style={{ background: ts.bg, color: ts.fg }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">PEEB Tier</p>
          <p className="text-xl font-black mt-0.5">{tier.label}</p>
          <p className="text-xs opacity-60 mt-1">Grant on EE capex only</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black leading-none">{calc.energyGain.toFixed(1)}%</p>
          <p className="text-xs opacity-70 mt-1">Primary energy gain</p>
        </div>
      </div>

      {calc.synergyApplied && (
        <div className="ai-box-soft flex items-center gap-2 text-sm fade-in">
          <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
          <span><strong>Thermal synergy active</strong> — HVAC: capex −20%, efficiency +15%</span>
        </div>
      )}

      {/* Capex split EE / GR */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ai-gris)' }}>
        <div className="grid grid-cols-2">
          <div className="p-3 text-center" style={{ background: 'var(--ai-rouge-clair)', borderRight: '1px solid var(--ai-gris)' }}>
            <p className="text-xs font-bold uppercase" style={{ color: 'var(--ai-rouge)' }}>EE Capex</p>
            <p className="text-base font-black" style={{ color: 'var(--ai-violet)' }}>{formatCurrency(calc.capex.ee.total, currency)}</p>
            <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>{formatCurrency(calc.capex.ee.perM2, currency)}/m²</p>
          </div>
          <div className="p-3 text-center" style={{ background: 'rgba(48,50,62,.06)' }}>
            <p className="text-xs font-bold uppercase" style={{ color: 'var(--ai-violet)' }}>GR Capex</p>
            <p className="text-base font-black" style={{ color: 'var(--ai-violet)' }}>{formatCurrency(calc.capex.gr.total, currency)}</p>
            <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>{formatCurrency(calc.capex.gr.perM2, currency)}/m²</p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Capex',      value: formatCurrency(calc.capex.total, currency),               icon: Banknote   },
          { label: 'PEEB Grant',       value: formatCurrency(calc.peebGrant, currency),                  icon: TrendingUp },
          { label: 'Net Cost',         value: formatCurrency(calc.netCapex, currency),                   icon: Banknote   },
          { label: 'Payback',          value: calc.paybackYears ? `${calc.paybackYears} yrs` : '—',      icon: Clock      },
          { label: 'Annual Savings',   value: formatCurrency(calc.annualSavings, currency) + '/yr',      icon: Zap        },
          { label: 'CO₂ Avoided',      value: `${calc.co2AvoidedTon} tCO₂/yr`,                          icon: Leaf       },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: 'var(--ai-gris-clair)', border: '1px solid var(--ai-gris)' }}>
            <Icon className="w-4 h-4" style={{ color: 'var(--ai-rouge)' }} />
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--ai-violet)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Score breakdown panel ────────────────────────────────────────────────────
const SLOT_COLORS = [
  'var(--ai-rouge)', 'var(--ai-violet)', '#22a05a', '#d97706', '#3b82f6',
];

function ScorePanel({ building, calc, scoreConfig }) {
  const score = calculateScore(building, calc, scoreConfig);
  const { total, breakdown } = score;
  const totalColor = total >= 70 ? '#22a05a' : total >= 40 ? '#d97706' : 'var(--ai-rouge)';

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 text-center" style={{ minWidth: 64 }}>
          <p className="font-black leading-none" style={{ fontSize: '2.6rem', color: totalColor }}>
            {total}
          </p>
          <p className="text-xs font-semibold" style={{ color: 'var(--ai-noir70)' }}>/ 100</p>
        </div>
        <div className="flex-1">
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--ai-gris-clair)' }}>
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${total}%`, background: totalColor }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ai-noir70)' }}>
            {total >= 70 ? 'High priority' : total >= 40 ? 'Medium priority' : 'Low priority'}
          </p>
        </div>
      </div>

      {/* Criterion bars */}
      <div className="space-y-3">
        {breakdown.map(({ pts, max, label, detail, direction }, i) => {
          const color = SLOT_COLORS[i % SLOT_COLORS.length];
          const pct   = max > 0 ? (pts / max) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--ai-violet)' }}>
                  {label}
                  {direction === 'lower' && (
                    <span className="text-xs" style={{ color: 'var(--ai-noir70)' }} title="Lower is better">↓</span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--ai-noir70)' }}>{detail}</span>
                  <span className="font-black" style={{ color, minWidth: 36, textAlign: 'right' }}>
                    {pts} <span className="font-normal" style={{ color: 'var(--ai-noir70)' }}>/ {max}</span>
                  </span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ai-gris-clair)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs" style={{ color: 'var(--ai-noir70)', borderTop: '1px dashed var(--ai-gris)', paddingTop: 8 }}>
        Score updates live as EE measures are selected. Criteria configurable in Parameters.
      </p>
    </div>
  );
}

// ─── Financing panel ──────────────────────────────────────────────────────────
function FinancingPanel({ building: b, calc }) {
  const { updateBuilding, params } = useApp();
  const { currency, exchangeRate } = params;
  const convert = (jod) => currency === 'EUR' ? jod * exchangeRate : jod;

  const totalCapexJOD = calc?._jod?.capex   ?? 0;
  const peebGrantJOD  = b.peebSelected ? (calc?._jod?.peebGrant ?? 0) : 0;
  const remaining     = Math.max(0, totalCapexJOD - peebGrantJOD);

  // Derive initial percentages from stored amounts
  const deriveInitPcts = (bld, rem) => {
    if (rem <= 0) return { afd: 0, national: 0, others: 0 };
    return {
      afd:      Math.round((bld.afdLoan        || 0) / rem * 100),
      national: Math.round((bld.nationalBudget || 0) / rem * 100),
      others:   Math.round((bld.others         || 0) / rem * 100),
    };
  };

  const [pcts, setPcts] = useState(() => deriveInitPcts(b, remaining));

  // Reset percentages when building changes
  useEffect(() => {
    setPcts(deriveInitPcts(b, remaining));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id]);

  const pctTotal = pcts.afd + pcts.national + pcts.others;
  const isValid  = pctTotal === 100;

  const handlePct = (key, raw) => {
    const val  = Math.max(0, Math.min(100, parseInt(raw) || 0));
    const next = { ...pcts, [key]: val };
    setPcts(next);
    if (remaining > 0) {
      updateBuilding(b.id, {
        afdLoan:        Math.round(remaining * next.afd      / 100),
        nationalBudget: Math.round(remaining * next.national / 100),
        others:         Math.round(remaining * next.others   / 100),
      });
    }
  };

  const fmtJOD = (jod) => formatCurrency(convert(jod), currency);

  const FUNDING_ROWS = [
    { key: 'afd',      label: 'AFD Loan %'        },
    { key: 'national', label: 'National Budget %'  },
    { key: 'others',   label: 'Others %'           },
  ];

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--ai-gris)' }}>
        <div className="flex justify-between items-center px-3 py-2"
          style={{ borderBottom: '1px solid var(--ai-gris-clair)', background: 'white' }}>
          <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>Total CAPEX</span>
          <span className="text-sm font-black" style={{ color: 'var(--ai-violet)' }}>
            {totalCapexJOD > 0 ? fmtJOD(totalCapexJOD) : '—'}
          </span>
        </div>

        {b.peebSelected && peebGrantJOD > 0 && (
          <div className="flex justify-between items-center px-3 py-2"
            style={{ borderBottom: '1px solid var(--ai-gris-clair)', background: 'white' }}>
            <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>PEEB Grant</span>
            <span className="text-sm font-bold" style={{ color: '#22a05a' }}>
              − {fmtJOD(peebGrantJOD)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center px-3 py-2"
          style={{ background: 'var(--ai-gris)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--ai-violet)' }}>Remaining to finance</span>
          <span className="text-sm font-black" style={{ color: 'var(--ai-rouge)' }}>
            {totalCapexJOD > 0 ? fmtJOD(remaining) : '—'}
          </span>
        </div>
      </div>

      {totalCapexJOD === 0 ? (
        <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
          Select EE or GR measures to compute CAPEX before distributing funding.
        </p>
      ) : (
        <>
          <p className="text-xs font-semibold" style={{ color: 'var(--ai-violet)' }}>
            Distribute remaining to finance (must sum to 100%):
          </p>

          {!isValid && (
            <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
              style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
              <span style={{ color: 'var(--ai-rouge)' }}>
                Percentages must sum to 100%. Current total: <strong>{pctTotal}%</strong>.
              </span>
            </div>
          )}

          {FUNDING_ROWS.map(({ key, label }) => (
            <div key={key} className="rounded-lg p-3"
              style={{ background: 'var(--ai-gris)', border: '1px solid var(--ai-gris-clair)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--ai-violet)' }}>{label}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="0" max="100" step="1"
                    value={pcts[key]}
                    onChange={e => handlePct(key, e.target.value)}
                    className="input w-16 text-right text-sm py-0.5"
                  />
                  <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
                </div>
              </div>
              <p className="text-xs font-bold text-right" style={{ color: 'var(--ai-rouge)' }}>
                = {fmtJOD(remaining * pcts[key] / 100)}
              </p>
            </div>
          ))}

          {/* Total indicator */}
          <div className="flex justify-between items-center px-3 py-2 rounded-lg"
            style={{
              background: isValid ? '#dcfce7' : 'var(--ai-rouge-clair)',
              border: `1px solid ${isValid ? '#22a05a' : 'var(--ai-rouge)'}`,
            }}>
            <span className="text-xs font-bold" style={{ color: isValid ? '#16a34a' : 'var(--ai-rouge)' }}>
              Total
            </span>
            <span className="text-sm font-black" style={{ color: isValid ? '#16a34a' : 'var(--ai-rouge)' }}>
              {pctTotal}% {isValid ? '✓' : '⚠'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Galerie photos ───────────────────────────────────────────────────────────
export function ImageGallery({ building }) {
  const { addImage, removeImage } = useApp();
  const fileRef = useRef();
  const handleFiles = (files) => {
    Array.from(files).forEach(f => { if (f.type.startsWith('image/')) addImage(building.id, URL.createObjectURL(f)); });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {building.images.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => removeImage(building.id, i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(48,50,62,.7)' }}>
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        <button onClick={() => fileRef.current.click()}
          className="w-24 h-24 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
          style={{ border: '2px dashed var(--ai-gris)', color: 'var(--ai-noir70)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ai-rouge)'; e.currentTarget.style.color = 'var(--ai-rouge)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ai-gris)'; e.currentTarget.style.color = 'var(--ai-noir70)'; }}>
          <Camera className="w-5 h-5" />
          <span className="text-xs">Add photo</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

// ─── Fiche PDF print-only ─────────────────────────────────────────────────────
function PrintDatasheet({ building: b, calc, params }) {
  const tier = calc?.tier;
  return (
    <div className="print-only peeb-datasheet p-8">
      <div className="kpi-bar" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'18pt' }}>{b.name}</h1>
          <p style={{ margin:0, opacity:.75, fontSize:'10pt' }}>{b.typology} · {b.governorate} · {b.address}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:'9pt', opacity:.7, margin:0 }}>PEEB Med Jordan — Sheet D2</p>
          <p style={{ fontSize:'9pt', opacity:.7, margin:0 }}>{new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>

      <h2>Building Information</h2>
      <table><tbody>
        {[
          ['ID', b.id], ['Typology', b.typology], ['Floor Area', `${b.area} m²`],
          ['Year Built', b.yearBuilt], ['Floors', b.floors],
          ['Baseline EUI', `${b.baselineEUI} kWh/m²/yr`],
          ['Location', b.address],
          ['GPS Coordinates', b.coordinates?.join(', ')],
          ['Operating Hours', b.operatingHours],
          ['Funding Source', b.fundingSource || 'None'],
          ['PEEB Selected', b.peebSelected ? 'Yes' : 'No'],
        ].map(([k, v]) => (
          <tr key={k}><td style={{ color:'#4D4D4D', padding:'4px 8px', width:'35%' }}>{k}</td>
          <td style={{ padding:'4px 8px', fontWeight:600 }}>{v ?? '—'}</td></tr>
        ))}
      </tbody></table>

      {b.coordinates?.length === 2 && (
        <>
          <h2>Location</h2>
          <p style={{ fontSize:'9pt' }}>
            GPS: {b.coordinates.join(', ')}<br />
            Address: {b.address}
          </p>
        </>
      )}

      {calc && (<>
        <h2>Energy Results — {tier?.label}</h2>
        <table>
          <thead><tr><th>Indicator</th><th style={{ textAlign:'right' }}>Value</th></tr></thead>
          <tbody>
            {[
              ['Primary Energy Gain', `${calc.energyGain.toFixed(1)}%`],
              ['PEEB Grant Rate', `${Math.round(tier.grantRate * 100)}%`],
              ['EE Capex', formatCurrency(calc.capex.ee.total, params.currency)],
              ['GR Capex', formatCurrency(calc.capex.gr.total, params.currency)],
              ['Total Capex', formatCurrency(calc.capex.total, params.currency)],
              ['PEEB Grant (on EE capex)', formatCurrency(calc.peebGrant, params.currency)],
              ['Net Cost', formatCurrency(calc.netCapex, params.currency)],
              ['Energy Saved', `${calc.energySavedKWh.toLocaleString()} kWh/yr`],
              ['Annual Savings', `${formatCurrency(calc.annualSavings, params.currency)}/yr`],
              ['CO₂ Avoided', `${calc.co2AvoidedTon} tCO₂/yr`],
              ['Payback', calc.paybackYears ? `${calc.paybackYears} yrs` : '—'],
            ].map(([k, v], i) => (
              <tr key={k} style={{ background: i%2===0?'white':'#F2F2F2' }}>
                <td style={{ padding:'5px 8px', color:'#4D4D4D' }}>{k}</td>
                <td style={{ padding:'5px 8px', textAlign:'right', fontWeight:600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>)}

      {b.siteObservations && (<>
        <h2>Site Observations</h2>
        <p style={{ fontSize:'9pt', lineHeight:1.6 }}>{b.siteObservations}</p>
      </>)}

      <div className="footer-legal" style={{ display:'flex', justifyContent:'space-between' }}>
        <span><strong>Assemblage ingénierie S.A.S.U.</strong> · 79 rue Victor Hugo, 94200 Ivry-sur-Seine · contact@assemblage.net · assemblage.net</span>
        <span>{b.id}</span>
      </div>
    </div>
  );
}

// ─── Profil principal ─────────────────────────────────────────────────────────
export default function BuildingProfile() {
  const { selectedBuilding, updateBuilding, params, deleteBuilding } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!selectedBuilding) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--ai-noir70)' }}>
        <p>No building selected. Click a row in the inventory.</p>
      </div>
    );
  }

  const b    = selectedBuilding;
  const calc = b.calc;
  const ineligible = b.eligibility.ineligible;

  return (
    <div className="space-y-6 fade-in">
      {/* Alerts */}
      {ineligible && (
        <div className="ai-box-soft flex items-center gap-3 text-sm">
          <Ban className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
          <span>
            <strong>Ineligible for PEEB grant</strong>
            {b.eligibility.reason === 'donor' && <> — donor funding already engaged: <strong>{b.eligibility.donor}</strong></>}
            {b.eligibility.reason === 'manual' && <> — manually marked as ineligible</>}
          </span>
        </div>
      )}
      {b.gaps.length > 0 && (
        <div className="ai-box-synth flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#d97706' }} />
          <span><strong>{b.gaps.length} missing field(s):</strong> {b.gaps.join(', ')} — suggested values shown in <em>italics</em>.</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge" style={{
            background: ineligible ? 'var(--ai-rouge-clair)' : (b.peebSelected ? 'var(--ai-rouge)' : 'var(--ai-gris)'),
            color:      ineligible ? 'var(--ai-rouge)'       : (b.peebSelected ? 'white'           : 'var(--ai-violet)'),
          }}>
            {ineligible ? 'Ineligible' : b.peebSelected ? 'PEEB Selected' : 'Eligible'}
          </span>
          <span className="badge" style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}>{b.typology}</span>
          <span className="badge" style={{ background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}>{b.governorate}</span>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-secondary"
            style={{ color: 'var(--ai-rouge)', borderColor: 'var(--ai-rouge)' }}
            title="Delete this building"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in no-print"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--ai-rouge-clair)' }}
              >
                <Trash2 className="w-5 h-5" style={{ color: 'var(--ai-rouge)' }} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Delete building?</h3>
            </div>
            <div className="px-6 py-5 text-sm text-slate-700 space-y-2">
              <p>
                You are about to permanently delete{' '}
                <strong style={{ color: 'var(--ai-violet)' }}>{b.name}</strong> from the database.
              </p>
              <p className="text-xs text-slate-500">
                This action cannot be undone. All associated measures, photos and observations will be removed.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                onClick={() => { setConfirmDelete(false); deleteBuilding(b.id); }}
                className="btn-primary text-sm"
                style={{ background: 'var(--ai-rouge)', borderColor: 'var(--ai-rouge)' }}
              >
                <Trash2 className="w-4 h-4" /> Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Building info — all fields editable (click a row) */}
          <Section title="Building Information">
            <div className="space-y-1">
              <InfoRow label="ID" value={b.id} icon={Building2} />
              <EditableInfoRow label="Name"           icon={Building2} value={b.name}
                               onCommit={v => updateBuilding(b.id, { name: v })} />
              <EditableInfoRow label="Typology"       icon={Building2} value={b.typology}
                               options={['School','Hospital','Office','Municipality','University']}
                               onCommit={v => updateBuilding(b.id, { typology: v })} />
              <EditableInfoRow label="Governorate"    icon={MapPin}    value={b.governorate}
                               onCommit={v => updateBuilding(b.id, { governorate: v })} />
              <EditableInfoRow label="Address"        icon={MapPin}    value={b.address}
                               onCommit={v => updateBuilding(b.id, { address: v })} />
              <EditableInfoRow label="Year Built"     icon={Calendar}  value={b.yearBuilt} type="number"
                               italic={!b.yearBuilt}
                               onCommit={v => updateBuilding(b.id, { yearBuilt: v })} />
              <EditableInfoRow label="Floors"         icon={Layers}    value={b.floors} type="number"
                               italic={!b.floors}
                               onCommit={v => updateBuilding(b.id, { floors: v })} />
              <EditableInfoRow label="Floor Area"     icon={Ruler}     value={b.area} type="number"
                               italic={!b.area}      suffix="m²"
                               onCommit={v => updateBuilding(b.id, { area: v })} />
              <EditableInfoRow label="Baseline EUI"   icon={Zap}       value={b.baselineEUI} type="number"
                               italic={!b.baselineEUI} suffix="kWh/m²/yr"
                               onCommit={v => updateBuilding(b.id, { baselineEUI: v })} />
              <EditableInfoRow label="Operating Hrs"  icon={Clock}     value={b.operatingHours}
                               italic={!b.operatingHours}
                               onCommit={v => updateBuilding(b.id, { operatingHours: v })} />
              <EditableInfoRow label="Funding Source" icon={Banknote}  value={b.fundingSource}
                               italic={!b.fundingSource}
                               onCommit={v => updateBuilding(b.id, { fundingSource: v })} />
              <EditableInfoRow label="Status"         icon={Building2} value={b.status || 'Planning'}
                               options={['Planning','Ongoing','Completed']}
                               onCommit={v => updateBuilding(b.id, { status: v })} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--ai-noir70)' }}>
              Click any value to edit. Press Enter to save, Esc to cancel.
            </p>
          </Section>

          {/* ── PEEB Eligibility ── */}
          <Section title="PEEB Eligibility">
            <div className="space-y-4">
              {/* Auto-detection status */}
              {b.eligibility.reason === 'donor' && (
                <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                  style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                  <Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                  <span style={{ color: 'var(--ai-rouge)' }}>
                    Donor funding detected (<strong>{b.eligibility.donor}</strong>) — building is auto-excluded from PEEB.
                  </span>
                </div>
              )}

              {/* Manual ineligibility checkbox */}
              <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                style={{
                  background: b.manuallyIneligible ? 'var(--ai-rouge-clair)' : 'var(--ai-gris)',
                  border: `1px solid ${b.manuallyIneligible ? 'var(--ai-rouge)' : 'var(--ai-gris-clair)'}`,
                }}>
                <input
                  type="checkbox"
                  checked={b.manuallyIneligible || false}
                  onChange={e => updateBuilding(b.id, { manuallyIneligible: e.target.checked })}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: 'var(--ai-rouge)', width: 16, height: 16 }}
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ai-rouge)' }}>
                    Manually mark as ineligible
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                    Overrides all automatic eligibility checks
                  </p>
                </div>
              </label>

              {/* PEEB selection — only if fully eligible */}
              {!ineligible && (
                <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                  style={{
                    background: b.peebSelected ? '#dcfce7' : 'var(--ai-gris)',
                    border: `1px solid ${b.peebSelected ? '#22a05a' : 'var(--ai-gris-clair)'}`,
                  }}>
                  <input
                    type="checkbox"
                    checked={b.peebSelected || false}
                    onChange={e => updateBuilding(b.id, { peebSelected: e.target.checked })}
                    className="mt-0.5 flex-shrink-0"
                    style={{ accentColor: '#22a05a', width: 16, height: 16 }}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                      Include in PEEB program
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                      PEEB grant will be applied to remaining-to-finance calculation
                    </p>
                  </div>
                </label>
              )}
            </div>
          </Section>

          <Section title="Location">
            <BuildingMiniMap building={b} />
          </Section>

          {/* ── Financing ── */}
          <Section title={`Complementary Financing (${params.currency})`}>
            <FinancingPanel building={b} calc={calc} />
          </Section>

          <Section title="Site Observations">
            <textarea rows={5} value={b.siteObservations}
              onChange={e => updateBuilding(b.id, { siteObservations: e.target.value })}
              className="input resize-none text-sm leading-relaxed"
              placeholder="Site conditions, observations, constraints…" />
          </Section>

          <Section title="Photo Gallery">
            <ImageGallery building={b} />
          </Section>
        </div>

        {/* ── Centre column — Measures ── */}
        <div className="xl:col-span-1 space-y-4">

          <Section title="Measures — Energy Efficiency">
            {/* ── Thermal Synergy explanation ── */}
            <div className="flex items-start gap-3 rounded-lg p-3 mb-3 text-xs"
              style={{
                background: calc?.synergyApplied ? 'var(--ai-rouge-clair)' : 'var(--ai-gris)',
                border: `1px solid ${calc?.synergyApplied ? 'var(--ai-rouge)' : 'var(--ai-gris-clair)'}`,
              }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: calc?.synergyApplied ? 'var(--ai-rouge)' : 'var(--ai-noir70)' }} />
              <div>
                <p className="font-bold mb-0.5" style={{ color: calc?.synergyApplied ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
                  Thermal Synergy {calc?.synergyApplied ? '— Active ✦' : ''}
                </p>
                <p style={{ color: 'var(--ai-noir70)', lineHeight: 1.5 }}>
                  When insulation or window replacement is selected, HVAC capex is reduced by 20%
                  (smaller equipment needed) and HVAC efficiency improves by 15%. This reflects
                  the reduced thermal load on the HVAC system.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {MEASURE_KEYS_EE.map(key => (
                <MeasureRow key={key} buildingId={b.id} measureKey={key}
                  measure={b.measures[key]} synApplied={calc?.synergyApplied} />
              ))}
            </div>
          </Section>

          <Section title="Measures — Global Refurbishment">
            <div className="space-y-2">
              {MEASURE_KEYS_GR.map(key => (
                <MeasureRow key={key} buildingId={b.id} measureKey={key}
                  measure={b.measures[key]} synApplied={false} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              These measures add to total capex but do not improve energy gain.
              They can be financed via the AFD Loan (non-EE portion).
            </p>
          </Section>
        </div>

        {/* ── Right column — Results & Score ── */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Calculation Results">
            <ResultsPanel calc={calc} params={params} />
          </Section>

          <Section title="PEEB Priority Score">
            <ScorePanel building={b} calc={calc} scoreConfig={params.scoreConfig} />
          </Section>

          <Section title="Administrative">
            <div className="space-y-3">
              <div>
                <label className="label">Status</label>
                <select value={b.status} onChange={e => updateBuilding(b.id, { status: e.target.value })} className="input">
                  {['Assessed','Pending Audit','Ineligible'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={b.priority} onChange={e => updateBuilding(b.id, { priority: e.target.value })} className="input">
                  {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <PrintDatasheet building={b} calc={calc} params={params} />
    </div>
  );
}
