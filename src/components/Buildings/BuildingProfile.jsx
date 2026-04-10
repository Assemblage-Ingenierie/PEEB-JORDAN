import { useState, useRef, useEffect } from 'react';
import {
  MapPin, Clock, Calendar, Layers, Ruler, Zap,
  Camera, X, Printer, AlertTriangle, Ban,
  Leaf, Banknote, TrendingUp, Wind, Lightbulb,
  Sun, Building2, Square, CheckCircle2, ShieldCheck,
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
function Section({ title, children }) {
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

function InfoRow({ label, value, icon: Icon, italic }) {
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
        Coordonnées non disponibles
      </div>
    );
  }

  return (
    <>
      {/* Carte interactive (écran) */}
      <div ref={mapRef} className="no-print"
        style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ai-gris)' }} />

      {/* Version impression */}
      <div className="print-only"
        style={{ padding: 10, background: 'var(--ai-gris-clair)', borderRadius: 6, fontSize: 10 }}>
        <strong>Localisation :</strong> {building.address}<br />
        <strong>Coordonnées GPS :</strong> {coords.join(', ')}<br />
        <a href={`https://www.openstreetmap.org/?mlat=${coords[0]}&mlon=${coords[1]}&zoom=14`}
          style={{ color: 'var(--ai-rouge)' }}>
          Voir sur OpenStreetMap →
        </a>
      </div>
    </>
  );
}

// ─── Icônes mesures ───────────────────────────────────────────────────────────
const ICON_MAP = { Layers, Square, Wind, Lightbulb, Sun, Building2, Accessibility: MapPin, ShieldCheck };

// ─── Ligne de mesure ─────────────────────────────────────────────────────────
function MeasureRow({ buildingId, measureKey, measure, synApplied }) {
  const { toggleMeasure, setMeasureValue } = useApp();
  const meta    = MEASURE_META[measureKey];
  const Icon    = ICON_MAP[meta.icon] || Layers;
  const synergy = synApplied && measureKey === 'hvac';
  const locked  = meta.lockSavings;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        border:     `1px solid ${measure.selected ? (locked ? 'var(--ai-violet)' : 'var(--ai-rouge)') : 'var(--ai-gris)'}`,
        background: measure.selected ? (locked ? 'rgba(48,50,62,.06)' : 'var(--ai-rouge-clair)') : 'white',
      }}>
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
              style={{ background: 'var(--ai-rouge)', color: 'white' }}>✦ Synergie −20%</span>
          )}
          {locked && (
            <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(48,50,62,.1)', color: 'var(--ai-violet)' }}>Réhabilitation globale</span>
          )}
        </p>
      </div>

      <input type="number" min="0" step="1" value={measure.capex}
        onChange={e => setMeasureValue(buildingId, measureKey, 'capex', parseFloat(e.target.value) || 0)}
        className="w-20 input text-xs text-right py-1" title="Capex JOD/m²" />
      <span className="text-xs w-14" style={{ color: 'var(--ai-noir70)' }}>JOD/m²</span>

      {/* Taux d'économie — verrouillé à 0% pour les mesures GR */}
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
  );
}

// ─── Résultats ────────────────────────────────────────────────────────────────
function ResultsPanel({ calc, params }) {
  if (!calc) return <p className="text-sm" style={{ color: 'var(--ai-noir70)' }}>Sélectionnez au moins une mesure EE.</p>;
  const tier = calc.tier;
  const ts   = TIER_STYLE[tier.color] || TIER_STYLE.slate;
  const { currency } = params;

  return (
    <div className="space-y-4 fade-in">
      {/* Bandeau palier */}
      <div className="flex items-center justify-between p-5 rounded-xl" style={{ background: ts.bg, color: ts.fg }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">Palier PEEB</p>
          <p className="text-xl font-black mt-0.5">{tier.label}</p>
          <p className="text-xs opacity-60 mt-1">Subvention sur capex EE uniquement</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black leading-none">{calc.energyGain.toFixed(1)}%</p>
          <p className="text-xs opacity-70 mt-1">Gain énergie primaire</p>
        </div>
      </div>

      {calc.synergyApplied && (
        <div className="ai-box-soft flex items-center gap-2 text-sm fade-in">
          <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
          <span><strong>Synergie thermique active</strong> — HVAC : capex −20%, efficacité +15%</span>
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

      {/* Grille KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Capex total',       value: formatCurrency(calc.capex.total, currency),     icon: Banknote   },
          { label: 'Subvention PEEB',   value: formatCurrency(calc.peebGrant, currency),        icon: TrendingUp },
          { label: 'Coût net',          value: formatCurrency(calc.netCapex, currency),         icon: Banknote   },
          { label: 'Retour invest.',     value: calc.paybackYears ? `${calc.paybackYears} ans` : '—', icon: Clock },
          { label: 'Économies / an',    value: formatCurrency(calc.annualSavings, currency) + '/an', icon: Zap  },
          { label: 'CO₂ évité',         value: `${calc.co2AvoidedTon} tCO₂/an`,               icon: Leaf       },
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

      {/* Criterion bars — iterate array */}
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

      {/* Hint */}
      <p className="text-xs" style={{ color: 'var(--ai-noir70)', borderTop: '1px dashed var(--ai-gris)', paddingTop: 8 }}>
        Score updates live as EE measures are selected. Criteria configurable in Parameters.
      </p>
    </div>
  );
}

// ─── Galerie photos ───────────────────────────────────────────────────────────
function ImageGallery({ building }) {
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
          <span className="text-xs">Ajouter</span>
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
          <p style={{ fontSize:'9pt', opacity:.7, margin:0 }}>PEEB Med Jordan — Fiche D2</p>
          <p style={{ fontSize:'9pt', opacity:.7, margin:0 }}>{new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <h2>Informations bâtiment</h2>
      <table><tbody>
        {[
          ['ID', b.id], ['Typologie', b.typology], ['Surface', `${b.area} m²`],
          ['Année', b.yearBuilt], ['Niveaux', b.floors],
          ['EUI de référence', `${b.baselineEUI} kWh/m²/an`],
          ['Localisation', b.address],
          ['Coordonnées GPS', b.coordinates?.join(', ')],
          ['Horaires', b.operatingHours],
          ['Financement', b.fundingSource || 'Aucun'],
        ].map(([k, v]) => (
          <tr key={k}><td style={{ color:'#4D4D4D', padding:'4px 8px', width:'35%' }}>{k}</td>
          <td style={{ padding:'4px 8px', fontWeight:600 }}>{v ?? '—'}</td></tr>
        ))}
      </tbody></table>

      {/* Localisation */}
      {b.coordinates?.length === 2 && (
        <>
          <h2>Localisation</h2>
          <p style={{ fontSize:'9pt' }}>
            Coordonnées GPS : {b.coordinates.join(', ')}<br />
            Adresse : {b.address}
          </p>
        </>
      )}

      {calc && (<>
        <h2>Résultats énergétiques — {tier?.label}</h2>
        <table>
          <thead><tr><th>Indicateur</th><th style={{ textAlign:'right' }}>Valeur</th></tr></thead>
          <tbody>
            {[
              ['Gain énergie primaire', `${calc.energyGain.toFixed(1)}%`],
              ['Taux subvention PEEB', `${Math.round(tier.grantRate * 100)}%`],
              ['Capex EE', formatCurrency(calc.capex.ee.total, params.currency)],
              ['Capex Réhabilitation globale', formatCurrency(calc.capex.gr.total, params.currency)],
              ['Capex total', formatCurrency(calc.capex.total, params.currency)],
              ['Subvention PEEB (sur capex EE)', formatCurrency(calc.peebGrant, params.currency)],
              ['Coût net', formatCurrency(calc.netCapex, params.currency)],
              ['Énergie économisée', `${calc.energySavedKWh.toLocaleString()} kWh/an`],
              ['Économies financières', `${formatCurrency(calc.annualSavings, params.currency)}/an`],
              ['CO₂ évité', `${calc.co2AvoidedTon} tCO₂/an`],
              ['Retour sur investissement', calc.paybackYears ? `${calc.paybackYears} ans` : '—'],
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
        <h2>Observations de site</h2>
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
  const { selectedBuilding, updateBuilding, params } = useApp();

  if (!selectedBuilding) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--ai-noir70)' }}>
        <p>Aucun bâtiment sélectionné. Cliquez une ligne dans l'inventaire.</p>
      </div>
    );
  }

  const b    = selectedBuilding;
  const calc = b.calc;

  return (
    <div className="space-y-6 fade-in">
      {/* Alertes */}
      {b.eligibility.ineligible && (
        <div className="ai-box-soft flex items-center gap-3 text-sm">
          <Ban className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
          <span><strong>Inéligible à la subvention PEEB</strong> — Financement donateur <strong>{b.eligibility.donor}</strong> déjà engagé.</span>
        </div>
      )}
      {b.gaps.length > 0 && (
        <div className="ai-box-synth flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#d97706' }} />
          <span><strong>{b.gaps.length} donnée(s) manquante(s) :</strong> {b.gaps.join(', ')} — valeurs suggérées en <em>italique</em>.</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge" style={{ background: b.eligibility.ineligible ? 'var(--ai-rouge-clair)' : 'var(--ai-rouge)', color: b.eligibility.ineligible ? 'var(--ai-rouge)' : 'white' }}>
            {b.eligibility.ineligible ? 'Inéligible' : 'Éligible'}
          </span>
          <span className="badge" style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}>{b.typology}</span>
          <span className="badge" style={{ background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}>{b.governorate}</span>
        </div>
        <button onClick={() => window.print()} className="btn-secondary no-print">
          <Printer className="w-4 h-4" /> Exporter PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Colonne gauche ── */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Informations bâtiment">
            <div className="space-y-1">
              <InfoRow label="ID"            value={b.id}                                        icon={Building2} />
              <InfoRow label="Adresse"       value={b.address}                                   icon={MapPin}    />
              <InfoRow label="Coordonnées"   value={b.coordinates?.join(', ')}                   icon={MapPin}    />
              <InfoRow label="Année"         value={b.yearBuilt}                                 icon={Calendar}  />
              <InfoRow label="Niveaux"       value={b.floors}                                    icon={Layers}    />
              <InfoRow label="Surface"       value={b.area ? `${b.area.toLocaleString()} m²` : null} icon={Ruler} italic={!b.area} />
              <InfoRow label="EUI référence" value={b.baselineEUI ? `${b.baselineEUI} kWh/m²/an` : null} icon={Zap} italic={!b.baselineEUI} />
              <InfoRow label="Horaires"      value={b.operatingHours}                            icon={Clock}     />
              <InfoRow label="Financement"   value={b.fundingSource || 'Aucun'}                  icon={Banknote}  />
            </div>
          </Section>

          <Section title="Localisation">
            <BuildingMiniMap building={b} />
          </Section>

          <Section title="Financements complémentaires (JOD)">
            <div className="space-y-3">
              {[
                { field: 'afdLoan',        label: 'Prêt AFD (parties non-EE)' },
                { field: 'nationalBudget', label: 'Budget national'            },
                { field: 'others',         label: 'Autres financements'        },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <input type="number" min="0" step="1000" value={b[field] || 0}
                    onChange={e => updateBuilding(b.id, { [field]: parseFloat(e.target.value) || 0 })}
                    className="input" />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Observations de site">
            <textarea rows={5} value={b.siteObservations}
              onChange={e => updateBuilding(b.id, { siteObservations: e.target.value })}
              className="input resize-none text-sm leading-relaxed"
              placeholder="Conditions de site, observations, contraintes…" />
          </Section>

          <Section title="Galerie photos">
            <ImageGallery building={b} />
          </Section>
        </div>

        {/* ── Colonne centrale — Mesures ── */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Mesures — Efficacité énergétique">
            <div className="space-y-2">
              {MEASURE_KEYS_EE.map(key => (
                <MeasureRow key={key} buildingId={b.id} measureKey={key}
                  measure={b.measures[key]} synApplied={calc?.synergyApplied} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              ✦ Isolation ou Fenêtres → <strong>Synergie thermique</strong> : HVAC capex −20%, efficacité +15%.
              La subvention PEEB s'applique au capex EE uniquement.
            </p>
          </Section>

          <Section title="Mesures — Réhabilitation globale">
            <div className="space-y-2">
              {MEASURE_KEYS_GR.map(key => (
                <MeasureRow key={key} buildingId={b.id} measureKey={key}
                  measure={b.measures[key]} synApplied={false} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              Ces mesures contribuent au capex total mais n'améliorent pas le gain EE.
              Elles peuvent être financées par le Prêt AFD (parties non-EE).
            </p>
          </Section>
        </div>

        {/* ── Colonne droite — Résultats ── */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Calculation Results">
            <ResultsPanel calc={calc} params={params} />
          </Section>

          <Section title="PEEB Score">
            <ScorePanel building={b} calc={calc} scoreConfig={params.scoreConfig} />
          </Section>

          <Section title="Administrative">
            <div className="space-y-3">
              <div>
                <label className="label">Statut</label>
                <select value={b.status} onChange={e => updateBuilding(b.id, { status: e.target.value })} className="input">
                  {['Assessed','Pending Audit','Ineligible'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priorité</label>
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

