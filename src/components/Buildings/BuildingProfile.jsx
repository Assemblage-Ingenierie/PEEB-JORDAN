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

// ─── Typology palette (kept in sync with BuildingInventory.TYPOLOGY_DISPLAY) ──
export const TYPOLOGY_BADGE = {
  Hospital:       { bg: '#fee2e2', color: '#b91c1c' },
  School:         { bg: '#dbeafe', color: '#1d4ed8' },
  University:     { bg: '#ede9fe', color: '#7c3aed' },
  Administration: { bg: '#fef9c3', color: '#854d0e' },
};

// ─── Tier palette ─────────────────────────────────────────────────────────────
const TIER_STYLE = {
  slate:  { bg: 'var(--ai-violet)',      fg: 'white'            },
  amber:  { bg: 'var(--ai-gris)',        fg: 'var(--ai-violet)' },
  blue:   { bg: 'var(--ai-rouge-clair)', fg: 'var(--ai-violet)' },
  green:  { bg: 'var(--ai-rouge)',       fg: 'white'            },
  purple: { bg: 'var(--ai-violet)',      fg: 'white'            },
};

// ─── Column header ────────────────────────────────────────────────────────────
export function ColHeader({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      color: 'var(--ai-violet)', opacity: 0.55,
      paddingBottom: 6, borderBottom: '2px solid var(--ai-gris)',
    }}>
      {children}
    </div>
  );
}

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

export function EditableInfoRow({ label, icon: Icon, value, onCommit, type = 'text', italic, suffix, options }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? '');

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
            onBlur={commit} className="input text-sm flex-1 py-1">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input autoFocus type={type} value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            className="input text-sm flex-1 py-1" />
        )
      ) : (
        <button type="button" onClick={() => setEditing(true)}
          className={`flex-1 text-left font-medium text-sm rounded px-1 -mx-1 cursor-text hover:bg-slate-50 ${italic ? 'italic' : ''}`}
          style={{ color: italic ? 'var(--ai-noir70)' : 'var(--ai-violet)' }}
          title="Click to edit">
          {display}{suffix && display !== '—' ? ` ${suffix}` : ''}
        </button>
      )}
    </div>
  );
}

// ─── Mini-map ─────────────────────────────────────────────────────────────────
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
        iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
        shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
      });
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
      const map = L.map(mapRef.current, {
        center: coords, zoom: 14,
        zoomControl: false, dragging: false, scrollWheelZoom: false, attributionControl: false,
      });
      leafletRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.circleMarker(coords, { radius: 11, fillColor: '#E30513', color: 'white', weight: 3, fillOpacity: 1 })
        .bindPopup(`<strong style="color:#30323E;font-family:Open Sans,sans-serif">${building.name}</strong>`)
        .addTo(map).openPopup();
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
      <div className="print-only" style={{ padding: 10, background: 'var(--ai-gris-clair)', borderRadius: 6, fontSize: 10 }}>
        <strong>Location:</strong> {building.address}<br />
        <strong>GPS:</strong> {coords.join(', ')}
      </div>
    </>
  );
}

// ─── Measure icons ────────────────────────────────────────────────────────────
const ICON_MAP = { Layers, Square, Wind, Lightbulb, Sun, Droplets, Building2, Accessibility: MapPin, ShieldCheck };

// ─── Measure row ──────────────────────────────────────────────────────────────
export function MeasureRow({ buildingId, measureKey, measure, synApplied, area }) {
  const { toggleMeasure, setMeasureValue } = useApp();
  const meta    = MEASURE_META[measureKey];
  const Icon    = ICON_MAP[meta.icon] || Layers;
  const synergy = synApplied && measureKey === 'hvac';
  const locked  = meta.lockSavings;
  const hasArea = typeof area === 'number' && area > 0;

  // Derived total: capex × area, OR the stored absolute when area is missing
  const totalVal = hasArea
    ? +((measure.capex || 0) * area).toFixed(0)
    : (measure.capexAbsolute ?? 0);

  const onPerM2 = (val) => {
    setMeasureValue(buildingId, measureKey, 'capex', val);
    if (hasArea) setMeasureValue(buildingId, measureKey, 'capexAbsolute', +(val * area).toFixed(0));
  };
  const onTotal = (val) => {
    setMeasureValue(buildingId, measureKey, 'capexAbsolute', val);
    if (hasArea) setMeasureValue(buildingId, measureKey, 'capex', +(val / area).toFixed(2));
  };

  return (
    <div className="rounded-xl transition-all"
      style={{
        border:     `1px solid ${measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'var(--ai-gris)'}`,
        background: measure.selected ? (locked ? 'rgba(48,50,62,.06)' : 'var(--ai-rouge-clair)') : 'white',
      }}>
      <div className="flex items-center gap-2 p-3">
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
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ai-violet)' }}>
            {meta.label}
            {synergy && (
              <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--ai-rouge)', color: 'white' }}>✦ Synergy −20%</span>
            )}
          </p>
        </div>

        <input type="number" min="0" step="1" value={measure.capex ?? 0}
          disabled={!hasArea}
          onChange={e => onPerM2(parseFloat(e.target.value) || 0)}
          className="w-16 input text-xs text-right py-1"
          style={{ opacity: hasArea ? 1 : 0.4 }}
          title={hasArea ? 'Unit cost JOD/m²' : 'Set the building area first to edit unit cost'} />
        <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>/m²</span>

        <input type="number" min="0" step="1" value={totalVal}
          onChange={e => onTotal(parseFloat(e.target.value) || 0)}
          className="w-20 input text-xs text-right py-1"
          title="Total CAPEX (JOD)" />
        <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>JOD</span>

        {!locked && (
          <>
            <input type="number" min="0" max="99" step="1"
              value={+(measure.savingsRate * 100).toFixed(1)}
              onChange={e => setMeasureValue(buildingId, measureKey, 'savingsRate', (parseFloat(e.target.value) || 0) / 100)}
              className="w-12 input text-xs text-right py-1" />
            <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
          </>
        )}
      </div>

      {measure.selected && (
        <div className="px-3 pb-3 fade-in">
          <textarea rows={2} value={measure.notes ?? ''}
            onChange={e => setMeasureValue(buildingId, measureKey, 'notes', e.target.value)}
            className="input resize-none text-xs leading-snug w-full"
            placeholder={`Precisions about ${meta.short ?? meta.label} — scope, brands, constraints…`} />
        </div>
      )}
    </div>
  );
}

// ─── Progress (Design / Works) ────────────────────────────────────────────────
export function ProgressBlock({ building }) {
  const { updateBuilding } = useApp();
  const cycle = (key) => {
    const v = building[key];
    const next = v === 'ongoing' ? 'completed' : v === 'completed' ? null : 'ongoing';
    updateBuilding(building.id, { [key]: next });
  };
  const pastille = (v) => {
    if (v === 'ongoing')   return { bg: '#fef9c3', fg: '#854d0e', label: 'Ongoing' };
    if (v === 'completed') return { bg: '#dcfce7', fg: '#166534', label: 'Completed' };
    return { bg: 'transparent', fg: 'var(--ai-noir70)', label: 'Not started' };
  };
  const row = (key, label) => {
    const s = pastille(building[key]);
    return (
      <div className="flex items-center justify-between gap-3" style={{ padding: '6px 0' }}>
        <span className="font-semibold" style={{ color: 'var(--ai-violet)', fontSize: 12 }}>{label}</span>
        <button onClick={() => cycle(key)} type="button"
          style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            border: building[key] ? 'none' : '1px solid var(--ai-gris)', cursor: 'pointer',
            background: s.bg, color: s.fg,
          }}
          title="Click to cycle: Not started → Ongoing → Completed">
          {s.label}
        </button>
      </div>
    );
  };
  return (
    <Section title="Progress">
      <p className="text-xs mb-2" style={{ color: 'var(--ai-noir70)' }}>
        Click the pastille to cycle status. These values appear read-only in the database view.
      </p>
      {row('designProgress', 'Design')}
      {row('worksProgress',  'Works')}
    </Section>
  );
}

// ─── Total energy saving block (Baseline / Project kWh + override) ───────────
export function TotalEnergySaving({ building }) {
  const { updateBuilding } = useApp();
  const area = building.area || 0;
  const baseline = building.totalBaselineKwh;
  const project  = building.totalProjectKwh;
  const diff = (typeof baseline === 'number' && typeof project === 'number') ? baseline - project : null;
  const autoGain = (typeof baseline === 'number' && baseline > 0 && typeof project === 'number')
    ? +((1 - project / baseline) * 100).toFixed(2) : null;
  const overrideOn = typeof building.gainOverride === 'number';
  const eui = (kwh) => (typeof kwh === 'number' && area > 0) ? +(kwh / area).toFixed(1) : null;

  const num = (v) => v === '' ? null : Number(v);
  const fmt = (v, unit) => v == null ? '—' : `${v.toLocaleString()} ${unit}`;

  const numCellStyle = { fontSize: 11, color: 'var(--ai-noir70)', textAlign: 'right' };

  return (
    <div className="rounded-xl mt-3 p-3 fade-in"
      style={{ border: '1px solid var(--ai-violet)', background: 'rgba(48,50,62,.04)' }}>
      <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--ai-violet)' }}>
        <Zap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
        Total Energy Saving
      </p>

      <div className="grid gap-2" style={{ gridTemplateColumns: '110px 1fr 1fr 1fr', alignItems: 'center' }}>
        <div></div>
        <div className="text-center font-semibold" style={{ color: 'var(--ai-noir70)', fontSize: 10 }}>Baseline</div>
        <div className="text-center font-semibold" style={{ color: 'var(--ai-noir70)', fontSize: 10 }}>Project</div>
        <div className="text-center font-semibold" style={{ color: 'var(--ai-noir70)', fontSize: 10 }}>Difference</div>

        <div className="font-semibold" style={{ color: 'var(--ai-violet)', fontSize: 11 }}>kWh / yr</div>
        <input type="number" min="0" step="1" className="input text-right py-1"
          style={{ fontSize: 11 }}
          value={baseline ?? ''}
          onChange={e => updateBuilding(building.id, { totalBaselineKwh: num(e.target.value) })} />
        <input type="number" min="0" step="1" className="input text-right py-1"
          style={{ fontSize: 11 }}
          value={project ?? ''}
          onChange={e => updateBuilding(building.id, { totalProjectKwh: num(e.target.value) })} />
        <div className="font-bold" style={{ ...numCellStyle, color: 'var(--ai-rouge)', fontSize: 11 }}>
          {diff == null ? '—' : `${diff.toLocaleString()} kWh`}
        </div>

        <div className="font-semibold" style={{ color: 'var(--ai-violet)', fontSize: 11 }}>EUI (kWh/m²)</div>
        <div style={numCellStyle}>{fmt(eui(baseline), 'kWh/m²')}</div>
        <div style={numCellStyle}>{fmt(eui(project), 'kWh/m²')}</div>
        <div style={numCellStyle}>
          {eui(baseline) != null && eui(project) != null ? `${(eui(baseline) - eui(project)).toFixed(1)} kWh/m²` : '—'}
        </div>
      </div>

      <div className="mt-3 pt-2 flex items-center gap-2" style={{ borderTop: '1px dashed var(--ai-gris)' }}>
        <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11 }}>
          <input type="checkbox" checked={overrideOn}
            onChange={e => updateBuilding(building.id, {
              gainOverride: e.target.checked ? (autoGain ?? 0) : null,
            })}
            style={{ accentColor: 'var(--ai-rouge)' }} />
          <span style={{ color: 'var(--ai-violet)' }}>Force value</span>
        </label>
        <div className="flex items-center gap-1.5 ml-auto">
          <span style={{ color: 'var(--ai-noir70)', fontSize: 11 }}>Energy savings</span>
          {overrideOn ? (
            <>
              <input type="number" min="0" max="100" step="0.1"
                value={building.gainOverride}
                onChange={e => updateBuilding(building.id, { gainOverride: num(e.target.value) ?? 0 })}
                className="input w-16 text-right py-1" style={{ fontSize: 11 }} />
              <span style={{ color: 'var(--ai-noir70)', fontSize: 11 }}>%</span>
            </>
          ) : (
            <span className="font-bold" style={{ color: 'var(--ai-rouge)', fontSize: 12 }}>
              {autoGain == null ? '—' : `${autoGain.toFixed(1)} %`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calculation results ──────────────────────────────────────────────────────
export function ResultsPanel({ calc, params }) {
  if (!calc) return (
    <p className="text-sm" style={{ color: 'var(--ai-noir70)' }}>Select at least one EE measure.</p>
  );
  const tier = calc.tier;
  const ts   = TIER_STYLE[tier.color] || TIER_STYLE.slate;
  const { currency } = params;

  const rows = [
    { label: 'EE CAPEX',               value: formatCurrency(calc.capex.ee.total, currency) },
    { label: 'GR CAPEX',               value: formatCurrency(calc.capex.gr.total, currency) },
    { label: 'TOTAL CAPEX',            value: formatCurrency(calc.capex.total, currency),    bold: true },
    { label: 'Eligible PEEB Grant',    value: formatCurrency(calc.peebGrant, currency),      accent: true },
    { label: 'Remaining if PEEB Grant',value: formatCurrency(calc.netCapex, currency),       bold: true },
    { label: 'Annual Savings',         value: formatCurrency(calc.annualSavings, currency) + '/yr' },
    { label: 'Payback',                value: calc.paybackYears ? `${calc.paybackYears} yrs` : '—' },
    { label: 'CO₂ avoided',            value: `${calc.co2AvoidedTon} tCO₂/yr` },
  ];

  return (
    <div className="space-y-3 fade-in">
      {/* Compact tier indicator */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ background: ts.bg, color: ts.fg }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wide opacity-70">PEEB Tier</span>
          <span className="font-black text-sm">{tier.label}</span>
          <span className="text-xs opacity-60">
            · {tier.grantRate > 0 ? `${Math.round(tier.grantRate * 100)}% on EE capex` : 'no grant'}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-xl leading-none">{calc.energyGain.toFixed(1)}%</p>
          <p className="text-xs opacity-60">energy gain</p>
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--ai-gris)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {rows.map(({ label, value, bold, accent }) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--ai-gris-clair)' }}>
                <td style={{ padding: '5px 10px', color: 'var(--ai-noir70)', fontSize: 11 }}>{label}</td>
                <td style={{
                  padding: '5px 10px', textAlign: 'right',
                  fontWeight: bold || accent ? 700 : 500,
                  color: accent ? '#16a34a' : bold ? 'var(--ai-rouge)' : 'var(--ai-violet)',
                }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Score panel ──────────────────────────────────────────────────────────────
const BAR_COLOR = 'var(--ai-noir70)';

export function ScorePanel({ building, calc, scoreConfig }) {
  const score = calculateScore(building, calc, scoreConfig);
  const { total, breakdown } = score;
  const totalColor = total >= 70 ? '#22a05a' : total >= 40 ? '#d97706' : 'var(--ai-rouge)';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-center" style={{ minWidth: 48 }}>
          <p className="font-black leading-none" style={{ fontSize: '1.6rem', color: totalColor }}>{total}</p>
          <p style={{ color: 'var(--ai-noir70)', fontSize: 10 }}>/ 100</p>
        </div>
        <div className="flex-1">
          <div className="rounded-full overflow-hidden" style={{ background: 'var(--ai-gris-clair)', height: 6 }}>
            <div className="rounded-full transition-all duration-500"
              style={{ width: `${total}%`, background: totalColor, height: 6 }} />
          </div>
          <p style={{ color: 'var(--ai-noir70)', fontSize: 10, marginTop: 2 }}>
            {total >= 70 ? 'High priority' : total >= 40 ? 'Medium priority' : 'Low priority'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {breakdown.map(({ pts, max, label, detail, direction }, i) => {
          const pct = max > 0 ? (pts / max) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--ai-violet)', fontSize: 10 }}>
                  {label}
                  {direction === 'lower' && (
                    <span style={{ color: 'var(--ai-noir70)', fontSize: 10 }} title="Lower is better">↓</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5" style={{ fontSize: 10 }}>
                  <span style={{ color: 'var(--ai-noir70)' }}>{detail}</span>
                  <span className="font-bold" style={{ color: BAR_COLOR, minWidth: 32, textAlign: 'right' }}>
                    {pts}<span className="font-normal" style={{ color: 'var(--ai-noir70)' }}> / {max}</span>
                  </span>
                </span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ background: 'var(--ai-gris-clair)', height: 4 }}>
                <div className="rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: BAR_COLOR, height: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Financing panel ──────────────────────────────────────────────────────────
export function FinancingPanel({ building: b, calc }) {
  const { updateBuilding, params } = useApp();
  const { currency, exchangeRate } = params;
  const convert = (jod) => currency === 'EUR' ? jod * exchangeRate : jod;

  const totalCapexJOD = calc?._jod?.capex   ?? 0;
  const peebGrantJOD  = b.peebSelected ? (calc?._jod?.peebGrant ?? 0) : 0;
  const remaining     = Math.max(0, totalCapexJOD - peebGrantJOD);

  const deriveInitPcts = (bld, rem) => {
    if (rem <= 0) return { afd: 0, national: 0, others: 0 };
    return {
      afd:      Math.round((bld.afdLoan        || 0) / rem * 100),
      national: Math.round((bld.nationalBudget || 0) / rem * 100),
      others:   Math.round((bld.others         || 0) / rem * 100),
    };
  };

  const [pcts, setPcts] = useState(() => deriveInitPcts(b, remaining));

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
    { key: 'afd',      label: 'AFD Loan'        },
    { key: 'national', label: 'National Budget'  },
    { key: 'others',   label: 'Others'           },
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
            <span className="text-sm font-bold" style={{ color: '#22a05a' }}>− {fmtJOD(peebGrantJOD)}</span>
          </div>
        )}
        <div className="flex justify-between items-center px-3 py-2" style={{ background: 'var(--ai-gris)' }}>
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
            <div key={key} className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: 'var(--ai-gris-clair)', border: '1px solid var(--ai-gris)' }}>
              <label className="text-xs font-semibold flex-1" style={{ color: 'var(--ai-violet)' }}>
                {label}
              </label>
              <div className="flex items-center gap-1 flex-shrink-0">
                <input type="number" min="0" max="100" step="1"
                  value={pcts[key]}
                  onChange={e => handlePct(key, e.target.value)}
                  className="input w-14 text-right text-sm py-0.5" />
                <span className="text-xs" style={{ color: 'var(--ai-noir70)' }}>%</span>
              </div>
              <div className="rounded-lg px-3 py-1.5 font-bold text-sm text-right flex-shrink-0"
                style={{ background: 'white', border: '1px solid var(--ai-gris)', color: 'var(--ai-rouge)', minWidth: 95 }}>
                {fmtJOD(remaining * pcts[key] / 100)}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center px-3 py-2 rounded-lg"
            style={{
              background: isValid ? '#dcfce7' : 'var(--ai-rouge-clair)',
              border: `1px solid ${isValid ? '#22a05a' : 'var(--ai-rouge)'}`,
            }}>
            <span className="text-xs font-bold" style={{ color: isValid ? '#16a34a' : 'var(--ai-rouge)' }}>Total</span>
            <span className="text-sm font-black" style={{ color: isValid ? '#16a34a' : 'var(--ai-rouge)' }}>
              {pctTotal}% {isValid ? '✓' : '⚠'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Photo gallery ────────────────────────────────────────────────────────────
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

// ─── Print datasheet ──────────────────────────────────────────────────────────
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
          ['Baseline EUI', `${b.baselineEUI} kWh/m²/yr`], ['EUI Source', b.source || '—'],
          ['Location', b.address], ['GPS', b.coordinates?.join(', ')],
          ['Operating Hours', b.operatingHours], ['Funding Source', b.fundingSource || 'None'],
          ['Political Priority', b.priority], ['Status', b.status],
        ].map(([k, v]) => (
          <tr key={k}><td style={{ color:'#4D4D4D', padding:'4px 8px', width:'35%' }}>{k}</td>
          <td style={{ padding:'4px 8px', fontWeight:600 }}>{v ?? '—'}</td></tr>
        ))}
      </tbody></table>
      {calc && (<>
        <h2>Energy Results — {tier?.label}</h2>
        <table>
          <thead><tr><th>Indicator</th><th style={{ textAlign:'right' }}>Value</th></tr></thead>
          <tbody>
            {[
              ['Primary Energy Gain', `${calc.energyGain.toFixed(1)}%`],
              ['PEEB Grant Rate', `${Math.round(tier.grantRate * 100)}%`],
              ['EE CAPEX', formatCurrency(calc.capex.ee.total, params.currency)],
              ['GR CAPEX', formatCurrency(calc.capex.gr.total, params.currency)],
              ['Total CAPEX', formatCurrency(calc.capex.total, params.currency)],
              ['Eligible PEEB Grant', formatCurrency(calc.peebGrant, params.currency)],
              ['Remaining if PEEB Grant', formatCurrency(calc.netCapex, params.currency)],
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
        <span><strong>Assemblage ingénierie S.A.S.U.</strong> · 79 rue Victor Hugo, 94200 Ivry-sur-Seine</span>
        <span>{b.id}</span>
      </div>
    </div>
  );
}

// Snapshot the raw building data for diffing — strip enriched fields injected by the context.
function stripEnriched(b) {
  if (!b) return null;
  const { calc, gaps, eligibility, ...rest } = b;
  return rest;
}

// ─── Building profile ─────────────────────────────────────────────────────────
export default function BuildingProfile() {
  const { selectedBuilding, updateBuilding, params, deleteBuilding, setNavigationGuard, navigate, selectBuilding } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasFunding, setHasFunding] = useState(() => !!selectedBuilding?.fundingSource);

  // ── Dirty-tracking + leave-confirmation ──────────────────────────────────
  const originalRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const [savedToast, setSavedToast] = useState(false);

  // Snapshot when we open a new building
  useEffect(() => {
    if (selectedBuilding && !selectedBuilding.isDraft) {
      originalRef.current = JSON.parse(JSON.stringify(stripEnriched(selectedBuilding)));
      setIsDirty(false);
    }
  }, [selectedBuilding?.id]);

  // Detect divergence on every change
  useEffect(() => {
    if (!originalRef.current || !selectedBuilding) return;
    const current = JSON.stringify(stripEnriched(selectedBuilding));
    const original = JSON.stringify(originalRef.current);
    setIsDirty(current !== original);
  }, [selectedBuilding]);

  // Register navigation guard
  useEffect(() => {
    setNavigationGuard(({ view, id }) => {
      if (!isDirty) return true;
      setPendingNav({ view, id });
      return false;
    });
    return () => setNavigationGuard(null);
  }, [isDirty, setNavigationGuard]);

  // Warn on tab close / reload
  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSaveChanges = () => {
    // Changes auto-persist on every edit, so "Save" simply snapshots the new baseline.
    if (selectedBuilding) {
      originalRef.current = JSON.parse(JSON.stringify(stripEnriched(selectedBuilding)));
    }
    setIsDirty(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1500);
  };

  const handleDiscardChanges = () => {
    if (originalRef.current && selectedBuilding) {
      updateBuilding(selectedBuilding.id, originalRef.current);
      // Resync local UI-only flags that aren't recomputed from props on the fly
      setHasFunding(!!originalRef.current.fundingSource);
    }
    setIsDirty(false);
  };

  const proceedAfterDecision = () => {
    const target = pendingNav;
    setPendingNav(null);
    if (!target) return;
    // Disarm the guard so the immediate navigation isn't intercepted by a stale isDirty
    setNavigationGuard(null);
    if (target.view === 'profile') selectBuilding(target.id);
    else navigate(target.view, target.id);
  };

  useEffect(() => {
    setHasFunding(!!selectedBuilding?.fundingSource);
  }, [selectedBuilding?.id]);

  if (!selectedBuilding) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--ai-noir70)' }}>
        <p>No building selected. Click a row in the inventory.</p>
      </div>
    );
  }

  const b          = selectedBuilding;
  const calc       = b.calc;
  const ineligible = b.eligibility.ineligible;

  return (
    <div className="space-y-6 fade-in">

      {/* Alerts */}
      {ineligible && (
        <div className="ai-box-soft flex items-center gap-3 text-sm">
          <Ban className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
          <span>
            <strong>Ineligible for PEEB grant</strong>
            {b.eligibility.reason === 'donor'  && <> — donor funding already engaged: <strong>{b.eligibility.donor}</strong></>}
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
          {(() => {
            const tp = TYPOLOGY_BADGE[b.typology] || { bg: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' };
            return <span className="badge" style={{ background: tp.bg, color: tp.color }}>{b.typology}</span>;
          })()}
          <span className="badge" style={{ background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}>{b.governorate}</span>
        </div>
        <div className="flex items-center gap-2 no-print">
          {isDirty && (
            <span className="text-xs italic" style={{ color: '#d97706' }}>● unsaved changes</span>
          )}
          {savedToast && (
            <span className="text-xs italic" style={{ color: '#16a34a' }}>✓ saved</span>
          )}
          <button onClick={handleDiscardChanges} className="btn-secondary"
            disabled={!isDirty}
            style={{ opacity: isDirty ? 1 : 0.4, cursor: isDirty ? 'pointer' : 'not-allowed' }}>
            <X className="w-4 h-4" /> Discard
          </button>
          <button onClick={handleSaveChanges} className="btn-primary"
            disabled={!isDirty}
            style={{ opacity: isDirty ? 1 : 0.4, cursor: isDirty ? 'pointer' : 'not-allowed' }}>
            <CheckCircle2 className="w-4 h-4" /> Save changes
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={() => setConfirmDelete(true)} className="btn-secondary"
            style={{ color: 'var(--ai-rouge)', borderColor: 'var(--ai-rouge)' }}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Leave-confirmation modal */}
      {pendingNav && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in no-print"
          onClick={() => setPendingNav(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ai-rouge-clair)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#d97706' }} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Unsaved changes</h3>
            </div>
            <div className="px-6 py-5 text-sm text-slate-700 space-y-2">
              <p>You have unsaved changes on <strong style={{ color: 'var(--ai-violet)' }}>{b.name}</strong>.</p>
              <p className="text-xs text-slate-500">What would you like to do before leaving?</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 rounded-b-2xl flex-wrap">
              <button onClick={() => setPendingNav(null)} className="btn-secondary text-sm">
                Stay on page
              </button>
              <button onClick={() => { handleDiscardChanges(); proceedAfterDecision(); }}
                className="btn-secondary text-sm"
                style={{ color: 'var(--ai-rouge)', borderColor: 'var(--ai-rouge)' }}>
                Discard changes
              </button>
              <button onClick={() => { handleSaveChanges(); proceedAfterDecision(); }}
                className="btn-primary text-sm">
                Save &amp; leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in no-print"
          onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ai-rouge-clair)' }}>
                <Trash2 className="w-5 h-5" style={{ color: 'var(--ai-rouge)' }} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Delete building?</h3>
            </div>
            <div className="px-6 py-5 text-sm text-slate-700 space-y-2">
              <p>You are about to permanently delete <strong style={{ color: 'var(--ai-violet)' }}>{b.name}</strong>.</p>
              <p className="text-xs text-slate-500">This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => { setConfirmDelete(false); deleteBuilding(b.id); }}
                className="btn-primary text-sm" style={{ background: 'var(--ai-rouge)', borderColor: 'var(--ai-rouge)' }}>
                <Trash2 className="w-4 h-4" /> Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ══ Col 1 — General information ══ */}
        <div className="xl:col-span-1 space-y-4">
          <ColHeader>General information</ColHeader>

          <Section title="Building Information">
            <div className="space-y-1">
              <EditableInfoRow label="Name"           icon={Building2} value={b.name}
                onCommit={v => updateBuilding(b.id, { name: v })} />
              <EditableInfoRow label="Typology"       icon={Building2} value={b.typology}
                options={['School','Hospital','Administration','University']}
                onCommit={v => updateBuilding(b.id, { typology: v })} />
              <EditableInfoRow label="Year Built"     icon={Calendar}  value={b.yearBuilt} type="number"
                italic={!b.yearBuilt}
                onCommit={v => updateBuilding(b.id, { yearBuilt: v })} />
              <EditableInfoRow label="Floors"         icon={Layers}    value={b.floors} type="number"
                italic={!b.floors}
                onCommit={v => updateBuilding(b.id, { floors: v })} />
              <EditableInfoRow label="Floor Area"     icon={Ruler}     value={b.area} type="number"
                italic={!b.area} suffix="m²"
                onCommit={v => updateBuilding(b.id, { area: v })} />
              <EditableInfoRow label="Baseline EUI"   icon={Zap}       value={b.baselineEUI} type="number"
                italic={!b.baselineEUI} suffix="kWh/m²/yr"
                onCommit={v => updateBuilding(b.id, { baselineEUI: v })} />
              <EditableInfoRow label="EUI Source"     icon={Info}      value={b.source}
                options={['Audit', 'Extrapolated']}
                italic={!b.source}
                onCommit={v => updateBuilding(b.id, { source: v })} />
              <EditableInfoRow label="Operating Hrs"  icon={Clock}     value={b.operatingHours}
                italic={!b.operatingHours}
                onCommit={v => updateBuilding(b.id, { operatingHours: v })} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--ai-noir70)' }}>
              Click any value to edit. Press Enter to save, Esc to cancel.
            </p>
          </Section>

          <Section title="Location">
            <EditableInfoRow label="Governorate" icon={MapPin} value={b.governorate}
              onCommit={v => updateBuilding(b.id, { governorate: v })} />
            <EditableInfoRow label="Address" icon={MapPin} value={b.address}
              onCommit={v => updateBuilding(b.id, { address: v })} />
            <div className="mt-3">
              <BuildingMiniMap building={b} />
            </div>
          </Section>

          <Section title="Photo Gallery">
            <ImageGallery building={b} />
          </Section>

          <Section title="Site Observations">
            <textarea rows={5} value={b.siteObservations}
              onChange={e => updateBuilding(b.id, { siteObservations: e.target.value })}
              className="input resize-none text-sm leading-relaxed"
              placeholder="Site conditions, observations, constraints…" />
          </Section>
        </div>

        {/* ══ Col 2 — Refurbishment program ══ */}
        <div className="xl:col-span-1 space-y-4">
          <ColHeader>Refurbishment program</ColHeader>

          <Section title="EE Investment Program">
            <div className="space-y-3">

              {/* Existing Audit */}
              <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                style={{
                  background: b.existingAudit ? '#dcfce7' : 'var(--ai-gris)',
                  border: `1px solid ${b.existingAudit ? '#22a05a' : 'var(--ai-gris-clair)'}`,
                }}>
                <input type="checkbox" checked={!!b.existingAudit}
                  onChange={e => updateBuilding(b.id, {
                    existingAudit: e.target.checked,
                    ...(!e.target.checked && { auditAuthor: '' }),
                  })}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: '#22a05a', width: 16, height: 16 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: b.existingAudit ? '#16a34a' : 'var(--ai-violet)' }}>
                    Existing Audit
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                    An energy audit has been performed on this building
                  </p>
                </div>
              </label>

              {b.existingAudit && (
                <div className="fade-in pl-1 space-y-2">
                  <div>
                    <label className="label">Author</label>
                    <input type="text" className="input"
                      value={b.auditAuthor || ''}
                      onChange={e => updateBuilding(b.id, { auditAuthor: e.target.value })}
                      placeholder="Name of the audit author or organization" />
                  </div>
                  <div>
                    <label className="label">Audit Date</label>
                    <input type="date" className="input"
                      value={b.auditDate || ''}
                      onChange={e => updateBuilding(b.id, { auditDate: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Existing Funding */}
              <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                style={{
                  background: hasFunding ? 'var(--ai-rouge-clair)' : 'var(--ai-gris)',
                  border: `1px solid ${hasFunding ? 'var(--ai-rouge)' : 'var(--ai-gris-clair)'}`,
                }}>
                <input type="checkbox" checked={hasFunding}
                  onChange={e => {
                    setHasFunding(e.target.checked);
                    if (!e.target.checked) updateBuilding(b.id, { fundingSource: '' });
                  }}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: 'var(--ai-rouge)', width: 16, height: 16 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: hasFunding ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
                    Existing Funding
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                    This building already has an external funding source committed
                  </p>
                </div>
              </label>

              {hasFunding && (
                <div className="fade-in pl-1 space-y-2">
                  <div>
                    <label className="label">Source of Funding</label>
                    <input type="text" className="input"
                      value={b.fundingSource || ''}
                      onChange={e => updateBuilding(b.id, { fundingSource: e.target.value })}
                      placeholder="e.g. JREEEF, AFD, World Bank…" />
                  </div>
                  {b.fundingSource && (
                    <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 fade-in"
                      style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                      <Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                      <span style={{ color: 'var(--ai-rouge)' }}>
                        <strong>Donor funding detected</strong> — this building may be auto-excluded from PEEB grant eligibility.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Political Priority */}
              <div>
                <label className="label">Political Priority</label>
                <select value={b.priority} onChange={e => updateBuilding(b.id, { priority: e.target.value })} className="input">
                  {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

            </div>
          </Section>

          <Section title="Measures — Energy Efficiency">
            <div className="space-y-2">
              {MEASURE_KEYS_EE.map(key => (
                <MeasureRow key={key} buildingId={b.id} measureKey={key}
                  measure={b.measures[key]} synApplied={false} area={b.area} />
              ))}
            </div>
            <TotalEnergySaving building={b} />
          </Section>

          <Section title="Measures — Global Refurbishment">
            <div className="space-y-2">
              {MEASURE_KEYS_GR.map(key => (
                <MeasureRow key={key} buildingId={b.id} measureKey={key}
                  measure={b.measures[key]} synApplied={false} area={b.area} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              These measures add to total capex but do not improve energy gain. Eligible for AFD Loan.
            </p>
          </Section>

          <ProgressBlock building={b} />

        </div>

        {/* ══ Col 3 — Financing ══ */}
        <div className="xl:col-span-1 space-y-4">
          <ColHeader>Investment</ColHeader>

          <Section title="Calculation Results">
            <ResultsPanel calc={calc} params={params} />
          </Section>

          <Section title="PEEB Priority Score">
            <ScorePanel building={b} calc={calc} scoreConfig={params.scoreConfig} />
          </Section>

          <Section title="PEEB Eligibility">
            <div className="space-y-4">
              {b.eligibility.reason === 'donor' && (
                <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                  style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                  <Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                  <span style={{ color: 'var(--ai-rouge)' }}>
                    Donor funding detected (<strong>{b.eligibility.donor}</strong>) — auto-excluded from PEEB.
                  </span>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                style={{
                  background: b.manuallyIneligible ? 'var(--ai-rouge-clair)' : 'var(--ai-gris)',
                  border: `1px solid ${b.manuallyIneligible ? 'var(--ai-rouge)' : 'var(--ai-gris-clair)'}`,
                }}>
                <input type="checkbox" checked={b.manuallyIneligible || false}
                  onChange={e => updateBuilding(b.id, { manuallyIneligible: e.target.checked })}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: 'var(--ai-rouge)', width: 16, height: 16 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ai-rouge)' }}>
                    Manually mark as ineligible
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                    Excludes from PEEB grant — overrides all automatic checks
                  </p>
                </div>
              </label>

              {!ineligible && (
                <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                  style={{
                    background: b.peebSelected ? '#dcfce7' : 'var(--ai-gris)',
                    border: `1px solid ${b.peebSelected ? '#22a05a' : 'var(--ai-gris-clair)'}`,
                  }}>
                  <input type="checkbox" checked={b.peebSelected || false}
                    onChange={e => updateBuilding(b.id, { peebSelected: e.target.checked })}
                    className="mt-0.5 flex-shrink-0"
                    style={{ accentColor: '#22a05a', width: 16, height: 16 }} />
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

          <Section title={`Complementary Financing (${params.currency})`}>
            <FinancingPanel building={b} calc={calc} />
          </Section>
        </div>
      </div>

      <PrintDatasheet building={b} calc={calc} params={params} />
    </div>
  );
}
