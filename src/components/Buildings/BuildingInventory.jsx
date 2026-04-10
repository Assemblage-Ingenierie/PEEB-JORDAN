import { useState, useMemo } from 'react';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  Upload, AlertTriangle, Ban, Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, parseEdgeExport, TYPOLOGY_DEFAULTS, getFundingTier } from '../../engine/CalculationEngine';

// ─── EDGE Import Modal ────────────────────────────────────────────────────────
function EdgeImportModal({ onClose, onImport }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    const ext  = file.name.split('.').pop().toLowerCase();
    const type = ext === 'json' ? 'json' : ext === 'csv' ? 'csv' : null;
    if (!type) { setError('Seuls les fichiers .json ou .csv sont acceptés.'); return; }
    const text   = await file.text();
    const parsed = parseEdgeExport(text, type);
    if (!parsed) { setError('Impossible de lire le fichier. Vérifiez le format.'); return; }
    onImport(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(48,50,62,.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
        <h2 className="font-bold mb-1" style={{ color: 'var(--ai-violet)', fontSize: '15px' }}>Importer un export EDGE</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>Glissez-déposez ou sélectionnez un fichier .json ou .csv exporté depuis EDGE.</p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          className="rounded-xl p-8 text-center transition-colors"
          style={{
            border: `2px dashed ${dragging ? 'var(--ai-rouge)' : 'var(--ai-gris)'}`,
            background: dragging ? 'var(--ai-rouge-clair)' : 'var(--ai-gris-clair)',
          }}
        >
          <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: dragging ? 'var(--ai-rouge)' : 'var(--ai-noir70)' }} />
          <p className="text-sm mb-2" style={{ color: 'var(--ai-violet)' }}>Glisser & déposer ou cliquer pour parcourir</p>
          <input type="file" accept=".json,.csv" className="hidden" id="edge-file"
            onChange={e => handleFile(e.target.files[0])} />
          <label htmlFor="edge-file" className="btn-primary cursor-pointer text-xs">Choisir un fichier</label>
        </div>

        {error && <p className="text-xs mt-2" style={{ color: 'var(--ai-rouge)' }}>{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary text-xs">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Entête triable ───────────────────────────────────────────────────────────
function SortableHeader({ col, label, sortState, onSort }) {
  const active = sortState.col === col;
  const Icon   = active ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className="th cursor-pointer select-none"
      style={{ whiteSpace: 'nowrap' }}
      onClick={() => onSort(col)}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--ai-rouge-clair)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <span className="flex items-center gap-1">
        {label}
        <Icon className="w-3.5 h-3.5" style={{ color: active ? 'var(--ai-rouge)' : 'var(--ai-gris)' }} />
      </span>
    </th>
  );
}

// ─── Cellule avec lacune ou valeur suggérée ───────────────────────────────────
function GapCell({ value, field, typology, unit = '' }) {
  if (value !== null && value !== undefined && value !== '') {
    return <span>{value}{unit}</span>;
  }
  const defaults  = TYPOLOGY_DEFAULTS[typology];
  const suggested = defaults && field === 'baselineEUI' ? defaults.baselineEUI : null;
  if (suggested !== null) {
    return <span className="data-suggested" title="Valeur suggérée selon la typologie">~{suggested}{unit}</span>;
  }
  return <span className="data-gap text-xs px-1.5 py-0.5 rounded">Manquant</span>;
}

// ─── Paliers → couleurs Assemblage ────────────────────────────────────────────
const TIER_HEX = {
  slate:  '#DFE4E8', amber: '#F9E1E3', blue: '#f07070',
  green:  '#E30513', purple: '#30323E',
};

const STATUS_BADGE = {
  'Assessed':      'badge-green',
  'Pending Audit': 'badge-amber',
  'Ineligible':    'badge-red',
};
const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-slate' };

// ─── Inventaire principal ──────────────────────────────────────────────────────
export default function BuildingInventory() {
  const { buildings, selectBuilding, addBuildings, params } = useApp();
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [sort, setSort]             = useState({ col: 'name', dir: 'asc' });
  const [showImport, setShowImport] = useState(false);

  const handleSort = (col) =>
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const filtered = useMemo(() => {
    return buildings
      .filter(b => {
        const q = search.toLowerCase();
        const match = !q || b.name.toLowerCase().includes(q) ||
          b.governorate.toLowerCase().includes(q) ||
          b.typology.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q);
        if (!match) return false;
        if (filter === 'eligible')   return !b.eligibility.ineligible;
        if (filter === 'gap')        return b.gaps.length > 0;
        if (filter === 'ineligible') return b.eligibility.ineligible;
        return true;
      })
      .sort((a, b) => {
        let va = a[sort.col] ?? '', vb = b[sort.col] ?? '';
        if (sort.col === 'calc')      { va = a.calc?.energyGain ?? 0;        vb = b.calc?.energyGain ?? 0; }
        if (sort.col === 'peebGrant') { va = a.calc?._jod?.peebGrant ?? 0;   vb = b.calc?._jod?.peebGrant ?? 0; }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sort.dir === 'asc' ? -1 : 1;
        if (va > vb) return sort.dir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [buildings, search, filter, sort]);

  const FILTERS = [
    { id: 'all', label: 'Tous' },
    { id: 'eligible',   label: 'Éligibles' },
    { id: 'gap',        label: 'Lacunes' },
    { id: 'ineligible', label: 'Inéligibles' },
  ];

  return (
    <div className="space-y-4 fade-in">

      {/* ── Barre d'outils ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ai-noir70)' }} />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, type, gouvernorat…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filtres pills */}
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--ai-gris)' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1 rounded text-xs font-semibold transition-all"
              style={
                filter === f.id
                  ? { background: 'var(--ai-rouge)', color: 'white', boxShadow: '0 1px 2px rgba(0,0,0,.12)' }
                  : { background: 'transparent', color: 'var(--ai-violet)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowImport(true)} className="btn-secondary">
          <Upload className="w-4 h-4" /> Import EDGE
        </button>
      </div>

      {/* ── Tableau ── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--ai-violet)', borderBottom: '2px solid var(--ai-rouge)' }}>
                {[
                  { col: 'id',          label: 'ID'        },
                  { col: 'name',        label: 'Bâtiment'  },
                  { col: 'typology',    label: 'Type'      },
                  { col: 'governorate', label: 'Gov.'      },
                  { col: 'area',        label: 'Surface m²'},
                  { col: 'baselineEUI', label: 'EUI'       },
                  { col: 'calc',        label: 'Gain %'    },
                  { col: 'peebGrant',   label: 'Subvention'},
                ].map(({ col, label }) => (
                  <SortableHeader key={col} col={col} label={label} sortState={sort} onSort={handleSort}
                    style={{ color: 'white' }}
                  />
                ))}
                <th className="th" style={{ color: 'white' }}>Statut</th>
                <th className="th" style={{ color: 'white' }}>Priorité</th>
                <th className="th" style={{ color: 'white' }}></th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: 'var(--ai-gris-clair)' }}>
              {filtered.map((b, rowIdx) => {
                const inelig  = b.eligibility.ineligible;
                const hasGap  = b.gaps.length > 0;
                const gain    = b.calc?.energyGain;
                // tier variable kept for future use
                void getFundingTier;

                return (
                  <tr
                    key={b.id}
                    className="tr-hover"
                    style={{
                      background: rowIdx % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
                      opacity: inelig ? 0.65 : 1,
                    }}
                    onClick={() => selectBuilding(b.id)}
                  >
                    <td className="td font-mono text-xs" style={{ color: 'var(--ai-noir70)' }}>{b.id}</td>
                    <td className="td font-semibold max-w-[180px]" style={{ color: 'var(--ai-rouge)' }}>
                      <span className="flex items-center gap-1.5">
                        {inelig  && <Ban className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />}
                        {hasGap && !inelig && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#d97706' }} />}
                        <span className="truncate">{b.name}</span>
                      </span>
                    </td>
                    <td className="td">
                      <span className="badge" style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}>
                        {b.typology}
                      </span>
                    </td>
                    <td className="td" style={{ color: 'var(--ai-noir70)' }}>{b.governorate}</td>
                    <td className={`td text-right ${b.gaps.includes('area') ? 'data-gap' : ''}`}>
                      <GapCell value={b.area} field="area" typology={b.typology} />
                    </td>
                    <td className={`td text-right ${b.gaps.includes('baselineEUI') ? 'data-gap' : ''}`}>
                      <GapCell value={b.baselineEUI} field="baselineEUI" typology={b.typology} unit=" kWh/m²" />
                    </td>
                    <td className="td text-right font-bold" style={{ color: 'var(--ai-violet)' }}>
                      {gain !== undefined && gain !== null ? `${gain.toFixed(1)}%` : '—'}
                    </td>
                    <td className="td text-right font-semibold" style={{ color: 'var(--ai-violet)' }}>
                      {b.calc?._jod?.peebGrant
                        ? formatCurrency(
                            params.currency === 'EUR'
                              ? +(b.calc._jod.peebGrant * params.exchangeRate).toFixed(0)
                              : b.calc._jod.peebGrant,
                            params.currency, true
                          )
                        : '—'
                      }
                    </td>
                    <td className="td">
                      <span className={STATUS_BADGE[b.status] || 'badge-slate'}>{b.status}</span>
                    </td>
                    <td className="td">
                      <span className={PRIORITY_BADGE[b.priority] || 'badge-slate'}>{b.priority}</span>
                    </td>
                    <td className="td">
                      <button
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--ai-noir70)' }}
                        onClick={e => { e.stopPropagation(); selectBuilding(b.id); }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ai-rouge)'; e.currentTarget.style.background = 'var(--ai-rouge-clair)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ai-noir70)'; e.currentTarget.style.background = ''; }}
                        title="Ouvrir la fiche"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau */}
        <div
          className="px-4 py-2.5 text-xs"
          style={{ borderTop: '1px solid var(--ai-gris)', background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}
        >
          <strong>{filtered.length}</strong> / <strong>{buildings.length}</strong> bâtiments affichés
          {search && ` · filtre : "${search}"`}
        </div>
      </div>

      {showImport && (
        <EdgeImportModal onClose={() => setShowImport(false)} onImport={addBuildings} />
      )}
    </div>
  );
}
