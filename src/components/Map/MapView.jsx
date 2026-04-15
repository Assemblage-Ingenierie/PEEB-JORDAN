import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getFundingTier } from '../../engine/CalculationEngine';

// Tier → colour mapping for Leaflet circle markers
const TIER_COLOR = {
  slate:  '#94a3b8',
  amber:  '#f59e0b',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
};

const INELIGIBLE_COLOR = '#ef4444';

export default function MapView() {
  const { buildings, selectBuilding } = useApp();
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR / duplicate-init issues
    let L;
    import('leaflet').then(mod => {
      L = mod.default;

      // Fix default marker URLs for Vite
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      // Create map centred on Jordan
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

      // Add markers
      buildings.forEach(b => {
        if (!b.coordinates || b.coordinates.length < 2) return;
        const [lat, lng] = b.coordinates;
        const tier   = getFundingTier(b.calc?.energyGain ?? 0);
        const color  = b.eligibility.ineligible ? INELIGIBLE_COLOR : TIER_COLOR[tier.color];

        const peebSelected = b.peebSelected === true && !b.eligibility.ineligible;
        const circleMarker = L.circleMarker([lat, lng], {
          radius:      b.area ? Math.min(8 + b.area / 1500, 16) : 9,
          fillColor:   color,
          color:       peebSelected ? '#22a05a' : '#fff',
          weight:      peebSelected ? 3 : 2,
          opacity:     1,
          fillOpacity: b.eligibility.ineligible ? 0.55 : 0.85,
        });

        const gainStr  = b.calc?.energyGain != null ? `${b.calc.energyGain.toFixed(1)}%` : '—';
        const tierStr  = b.eligibility.ineligible ? '🚫 Ineligible' : tier.label;
        const selStr   = peebSelected ? '✅ PEEB Selected' : b.eligibility.ineligible ? '' : '⬜ Not selected';

        circleMarker.bindPopup(`
          <div style="min-width:200px;font-family:Inter,sans-serif;">
            <p style="font-weight:700;color:#1e3a5f;margin:0 0 4px">${b.name}</p>
            <p style="color:#64748b;font-size:12px;margin:0 0 6px">${b.typology} · ${b.governorate}</p>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <tr><td style="color:#64748b;padding:2px 4px">Area</td><td style="font-weight:600;padding:2px 4px">${b.area ? b.area.toLocaleString() + ' m²' : '—'}</td></tr>
              <tr><td style="color:#64748b;padding:2px 4px">EUI</td><td style="font-weight:600;padding:2px 4px">${b.baselineEUI ? b.baselineEUI + ' kWh/m²/yr' : '—'}</td></tr>
              <tr><td style="color:#64748b;padding:2px 4px">Energy Gain</td><td style="font-weight:600;padding:2px 4px">${gainStr}</td></tr>
              <tr><td style="color:#64748b;padding:2px 4px">Tier</td><td style="font-weight:600;padding:2px 4px">${tierStr}</td></tr>
              ${selStr ? `<tr><td style="color:#64748b;padding:2px 4px">PEEB</td><td style="font-weight:600;padding:2px 4px">${selStr}</td></tr>` : ''}
            </table>
            <button
              onclick="window.__peebSelect('${b.id}')"
              style="margin-top:8px;width:100%;padding:6px;background:#2563eb;color:white;border:none;
                     border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;"
            >
              Open Profile →
            </button>
          </div>
        `, { maxWidth: 250 });

        circleMarker.addTo(map);
      });

      // Expose selectBuilding to popup onclick
      window.__peebSelect = (id) => selectBuilding(id);
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
      delete window.__peebSelect;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  return (
    <div className="space-y-4 fade-in">
      {/* Legend */}
      <div className="card py-3 no-print">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500" /> Map Legend:
          </span>
          {[
            { color: TIER_COLOR.slate,  label: 'Below Threshold' },
            { color: TIER_COLOR.amber,  label: 'Tier 1 — 50%'   },
            { color: TIER_COLOR.blue,   label: 'Tier 2 — 60%'   },
            { color: TIER_COLOR.green,  label: 'Tier 3 — 70%'   },
            { color: TIER_COLOR.purple, label: 'Tier 4 — 80%'   },
            { color: INELIGIBLE_COLOR,  label: 'Ineligible'     },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full shadow-sm"
              style={{ background: TIER_COLOR.amber, border: '2px solid #22a05a' }}
            />
            PEEB Selected
          </span>
          <span className="text-slate-400 ml-auto">Circle size ∝ floor area · Click marker to open profile</span>
        </div>
      </div>

      {/* Map container */}
      <div className="card p-0 overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
