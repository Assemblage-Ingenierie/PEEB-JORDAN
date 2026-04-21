import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../engine/CalculationEngine';

// Two-tone palette — red for PEEB-targeted, greys for the rest of the database
const COLOR_PEEB        = '#E30513'; // var(--ai-rouge)
const COLOR_DB_WORKS    = '#30323E'; // var(--ai-violet) — full DB with works (dark grey)
const COLOR_DB_NO_WORKS = '#B7C0C8'; // lighter than --ai-gris for DB without works

const UNIFORM_RADIUS = 8;

// Circle radius scaled by EE investment (JOD). No-works buildings get a fixed
// small dot so they stay visually secondary.
function scaledRadius(eeCapexJod, hasWorks) {
  if (!hasWorks) return 5;
  const r = 8 + Math.sqrt(Math.max(0, eeCapexJod) / 10_000);
  return Math.min(Math.max(r, 8), 22);
}

export default function MapView() {
  const { buildings: allBuildings, selectBuilding, params } = useApp();
  const buildings = allBuildings.filter(b => !b.isDraft);
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const [scaleBySize, setScaleBySize] = useState(true);
  const { currency, exchangeRate } = params;
  const toDisp = jod => currency === 'EUR' ? +(jod * exchangeRate).toFixed(0) : jod;

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR / duplicate-init issues
    let L;
    import('leaflet').then(mod => {
      L = mod.default;

      // Fix Leaflet default marker asset URLs broken by Vite's asset pipeline
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
        shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
      });

      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [31.5, 36.0],
        zoom:   7,
        zoomControl: true,
      });
      leafletRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Render non-PEEB first, then PEEB-targeted so the red markers draw on top.
      const ordered = [...buildings].sort((a, c) => {
        const aPeeb = a.peebSelected && !a.eligibility.ineligible ? 1 : 0;
        const cPeeb = c.peebSelected && !c.eligibility.ineligible ? 1 : 0;
        return aPeeb - cPeeb;
      });

      ordered.forEach(b => {
        if (!b.coordinates || b.coordinates.length < 2) return;
        const [lat, lng] = b.coordinates;

        const eeCapexJod   = b.calc?._jod?.eeCapex ?? 0;
        const isPeebTarget = b.peebSelected === true && !b.eligibility.ineligible;
        const hasWorks     = eeCapexJod > 0;

        const color  = isPeebTarget ? COLOR_PEEB
          : hasWorks ? COLOR_DB_WORKS
          : COLOR_DB_NO_WORKS;
        const radius = scaleBySize
          ? scaledRadius(eeCapexJod, hasWorks || isPeebTarget)
          : UNIFORM_RADIUS;

        const circleMarker = L.circleMarker([lat, lng], {
          radius,
          fillColor:   color,
          color:       '#fff',
          weight:      1.5,
          opacity:     1,
          fillOpacity: b.eligibility.ineligible ? 0.5 : 0.85,
        });

        // Build popup DOM with textContent — no HTML injection (XSS-safe)
        const popup = document.createElement('div');
        popup.style.cssText = 'min-width:200px;font-family:Inter,sans-serif;';

        const nameEl = document.createElement('p');
        nameEl.style.cssText = 'font-weight:700;color:#30323E;margin:0 0 4px';
        nameEl.textContent = b.name;
        popup.appendChild(nameEl);

        const subEl = document.createElement('p');
        subEl.style.cssText = 'color:#64748b;font-size:12px;margin:0 0 6px';
        subEl.textContent = `${b.typology} · ${b.governorate}`;
        popup.appendChild(subEl);

        const gainStr  = b.calc?.energyGain != null ? `${b.calc.energyGain.toFixed(1)}%` : '—';
        const eeCapStr = eeCapexJod > 0 ? formatCurrency(toDisp(eeCapexJod), currency, true) : '—';
        const statusStr = isPeebTarget
          ? 'PEEB Targeted'
          : b.eligibility.ineligible
            ? 'Ineligible'
            : hasWorks ? 'Works identified' : 'No works';

        const rows = [
          ['Status',      statusStr],
          ['Area',        b.area ? `${b.area.toLocaleString()} m²` : '—'],
          ['EUI',         b.baselineEUI ? `${b.baselineEUI} kWh/m²/yr` : '—'],
          ['Energy Gain', gainStr],
          ['CAPEX EE',    eeCapStr],
        ];
        const table = document.createElement('table');
        table.style.cssText = 'width:100%;font-size:12px;border-collapse:collapse;';
        rows.forEach(([label, value]) => {
          const tr = document.createElement('tr');
          const td1 = document.createElement('td');
          td1.style.cssText = 'color:#64748b;padding:2px 4px';
          td1.textContent = label;
          const td2 = document.createElement('td');
          td2.style.cssText = 'font-weight:600;padding:2px 4px';
          td2.textContent = value;
          tr.appendChild(td1);
          tr.appendChild(td2);
          table.appendChild(tr);
        });
        popup.appendChild(table);

        const btn = document.createElement('button');
        btn.style.cssText = 'margin-top:8px;width:100%;padding:6px;background:#E30513;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
        btn.textContent = 'Open Profile →';
        btn.addEventListener('click', () => selectBuilding(b.id));
        popup.appendChild(btn);

        circleMarker.bindPopup(popup, { maxWidth: 250 });
        circleMarker.addTo(map);
      });
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings, currency, exchangeRate, scaleBySize]);

  return (
    <div className="space-y-4 fade-in">
      {/* Legend */}
      <div className="card py-3 no-print">
        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--ai-noir70)' }}>
          <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--ai-violet)' }}>
            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--ai-rouge)' }} /> Map legend:
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full border-2 border-white shadow-sm"
              style={{ background: COLOR_PEEB, width: 16, height: 16 }}
            />
            PEEB Targeted
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full border-2 border-white shadow-sm"
              style={{ background: COLOR_DB_WORKS, width: 14, height: 14 }}
            />
            Full database · works identified
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full border-2 border-white shadow-sm"
              style={{ background: COLOR_DB_NO_WORKS, width: 8, height: 8 }}
            />
            Full database · no works
          </span>

          <label
            className="ml-auto flex items-center gap-2 cursor-pointer select-none"
            style={{ color: 'var(--ai-violet)' }}
            title="Toggle between circles sized by EE investment and uniform dots"
          >
            <input
              type="checkbox"
              checked={scaleBySize}
              onChange={e => setScaleBySize(e.target.checked)}
              style={{ accentColor: 'var(--ai-rouge)' }}
            />
            <span className="font-semibold">Scale circles by EE investment</span>
          </label>

          <span style={{ color: 'var(--ai-noir70)', fontStyle: 'italic' }}>
            Click a marker to open profile
          </span>
        </div>
      </div>

      {/* Map container */}
      <div className="card p-0 overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
