import { useState, useMemo } from 'react';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  Upload, AlertTriangle, Ban, Eye, ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, parseEdgeExport, TYPOLOGY_DEFAULTS, calculateScore } from '../../engine/CalculationEngine';

// ─── Jordan region mapping ────────────────────────────────────────────────────
const JORDAN_REGIONS = {
  Amman: 'Central', Zarqa: 'Central', Madaba: 'Central', Salt: 'Central', Balqa: 'Central',
  Irbid: 'North',   Mafraq: 'North',  Ajloun: 'North',   Jerash: 'North',
  Aqaba: 'South',   Karak: 'South',   Tafilah: 'South',  "Ma'an": 'South',
};
const getRegion = (gov) => JORDAN_REGIONS[gov] || '—';

const TYPOLOGIES = ['All', 'School', 'Hospital', 'Office', 'Municipality', 'University'];
const REGIONS    = ['All', 'North', 'Central', 'South'];

// ─── EDGE Import Modal ────────────────────────────────────────────────────────
function EdgeImportModal({ onClose, onImport }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    const ext  = file.name.split('.').pop().toLowerCase();
    const type = ext === 'json' ? 'json' : ext === 'csv' ? 'csv' : null;
    if (!type) { setError('Only .json or .csv files are accepted.'); return; }
    const text   = await file.text();
    const parsed = parseEdgeExport(text, type);
    if (!parsed) { setError('Unable to read the file. Check the format.'); return; }
    onImport(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(48,50,62,.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
        <h2 className="font-bold mb-1" style={{ color: 'var(--ai-violet)', fontSize: '15px' }}>
          Import EDGE Export
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--ai-noir70)' }}>
          Drag and drop or select a .json or .csv file exported from EDGE.
        </p>

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
          <Upload className="w-8 h-8 mx-auto mb-3"
            style={{ color: dragging ? 'var(--ai-rouge)' : 'var(--ai-noir70)' }} />
          <p className="text-sm mb-2" style={{ color: 'var(--ai-violet)' }}>
            Drag &amp; drop or click to browse
          </p>
          <input type="file" accept=".json,.csv" className="hidden" id="edge-file"
            onChange={e => handleFile(e.target.files[0])} />
          <label htmlFor="edge-file" className="btn-primary cursor-pointer text-xs">
            Choose file
          </label>
        </div>

        {error && <p className="text-xs mt-2" style={{ color: 'var(--ai-rouge)' }}>{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sortable header (white text on dark background) ──────────────────────────
function SortableHeader({ col, label, sortState, onSort }) {
  const active = sortState.col === col;
  const Icon   = active ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className="th cursor-pointer select-none"
      style={{ whiteSpace: 'nowrap', color: 'white' }}
      onClick={() => onSort(col)}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <span className="flex items-center gap-1">
        {label}
        <Icon className="w-3.5 h-3.5"
          style={{ color: active ? 'var(--ai-rouge)' : 'rgba(255,255,255,.35)' }} />
      </span>
    </th>
  );
}

// ─── Gap / suggested value cell ───────────────────────────────────────────────
function GapCell({ value, field, typology, unit = '' }) {
  if (value !== null && value !== undefined && value !== '') {
    return <span>{value}{unit}</span>;
  }
  const defaults  = TYPOLOGY_DEFAULTS[typology];
  const suggested = defaults && field === 'baselineEUI' ? defaults.baselineEUI : null;
  if (suggested !== null) {
    return (
      <span className="data-suggested" title="Suggested value based on typology">
        ~{suggested}{unit}
      </span>
    );
  }
  return <span className="data-gap text-xs px-1.5 py-0.5 rounded">Missing</span>;
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const bg = score >= 70 ? '#22a05a' : score >= 40 ? '#d97706' : 'var(--ai-rouge)';
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold text-white"
      style={{ background: bg }}
    >
      {score}
    </span>
  );
}

// ─── Filter dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input appearance-none pr-7 text-xs"
        style={{ minWidth: '130px' }}
      >
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style={{ color: 'var(--ai-noir70)' }}
      />
    </div>
  );
}

// ─── Tier hex palette ─────────────────────────────────────────────────────────
const TIER_HEX = {
  slate: '#DFE4E8', amber: '#F9E1E3', blue: '#f07070',
  green: '#E30513', purple: '#30323E',
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export default function BuildingInventory() {
  const { buildings, selectBuilding, addBuildings, params } = useApp();

  const [search,         setSearch]         = useState('');
  const [typologyFilter, setTypologyFilter] = useState('All');
  const [cityFilter,     setCityFilter]     = useState('All');
  const [regionFilter,   setRegionFilter]   = useState('All');
  const [sort,           setSort]           = useState({ col: 'name', dir: 'asc' });
  const [showImport,     setShowImport]     = useState(false);

  const handleSort = (col) =>
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));

  // Derive unique city list from data
  const cities = useMemo(() => [
    'All',
    ...[...new Set(buildings.map(b => b.governorate).filter(Boolean))].sort(),
  ], [buildings]);

  // PEEB eligibility: not ineligible AND energy gain >= 30%
  const isPeebEligible = (b) =>
    !b.eligibility.ineligible && (b.calc?.energyGain ?? 0) >= 30;

  const filtered = useMemo(() => {
    return buildings
      .filter(b => {
        const q = search.toLowerCase();
        if (q && !(
          b.name.toLowerCase().includes(q) ||
          (b.governorate || '').toLowerCase().includes(q) ||
          b.typology.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q)
        )) return false;

        if (typologyFilter !== 'All' && b.typology !== typologyFilter) return false;
        if (cityFilter !== 'All' && b.governorate !== cityFilter) return false;
        if (regionFilter !== 'All' && getRegion(b.governorate) !== regionFilter) return false;

        return true;
      })
      .sort((a, b) => {
        let va, vb;
        if (sort.col === 'score') {
          va = calculateScore(a, a.calc, params.scoreConfig).total;
          vb = calculateScore(b, b.calc, params.scoreConfig).total;
        } else if (sort.col === 'calc') {
          va = a.calc?.energyGain ?? 0;
          vb = b.calc?.energyGain ?? 0;
        } else if (sort.col === 'peebGrant') {
          va = a.calc?._jod?.peebGrant ?? 0;
          vb = b.calc?._jod?.peebGrant ?? 0;
        } else {
          va = a[sort.col] ?? '';
          vb = b[sort.col] ?? '';
        }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sort.dir === 'asc' ? -1 : 1;
        if (va > vb) return sort.dir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [buildings, search, typologyFilter, cityFilter, regionFilter, sort]);

  const columns = [
    { col: 'id',          label: 'ID'         },
    { col: 'name',        label: 'Building'   },
    { col: 'typology',    label: 'Type'       },
    { col: 'governorate', label: 'City'       },
    { col: 'area',        label: 'Area m²'    },
    { col: 'baselineEUI', label: 'EUI'        },
    { col: 'calc',        label: 'Gain %'     },
    { col: 'peebGrant',   label: 'Grant'      },
    { col: 'score',       label: 'Score /100' },
  ];

  return (
    <div className="space-y-4 fade-in">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--ai-noir70)' }} />
          <input
            className="input pl-9"
            placeholder="Search by name, type, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Dropdown filters */}
        <FilterDropdown
          value={typologyFilter}
          onChange={setTypologyFilter}
          options={TYPOLOGIES.map(t => ({ value: t, label: t === 'All' ? 'All typologies' : t }))}
        />
        <FilterDropdown
          value={cityFilter}
          onChange={setCityFilter}
          options={cities.map(c => ({ value: c, label: c === 'All' ? 'All cities' : c }))}
        />
        <FilterDropdown
          value={regionFilter}
          onChange={setRegionFilter}
          options={REGIONS.map(r => ({ value: r, label: r === 'All' ? 'All regions' : r }))}
        />

        <button onClick={() => setShowImport(true)} className="btn-secondary">
          <Upload className="w-4 h-4" /> Import EDGE
        </button>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--ai-violet)', borderBottom: '2px solid var(--ai-rouge)' }}>
                {columns.map(({ col, label }) => (
                  <SortableHeader key={col} col={col} label={label} sortState={sort} onSort={handleSort} />
                ))}
                <th className="th" style={{ color: 'white' }}></th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: 'var(--ai-gris-clair)' }}>
              {filtered.map((b, rowIdx) => {
                const inelig    = b.eligibility.ineligible;
                const hasGap    = b.gaps.length > 0;
                const eligible  = isPeebEligible(b);
                const gain      = b.calc?.energyGain;
                const score     = calculateScore(b, b.calc, params.scoreConfig).total;
                const grant     = b.calc?._jod?.peebGrant ?? 0;
                const grantDisplay = grant
                  ? formatCurrency(
                      params.currency === 'EUR'
                        ? +(grant * params.exchangeRate).toFixed(0)
                        : grant,
                      params.currency, true
                    )
                  : '—';

                return (
                  <tr
                    key={b.id}
                    className="tr-hover"
                    style={{
                      background: rowIdx % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
                      opacity: inelig ? 0.6 : 1,
                    }}
                    onClick={() => selectBuilding(b.id)}
                  >
                    {/* ID */}
                    <td className="td font-mono text-xs" style={{ color: 'var(--ai-noir70)' }}>
                      {b.id}
                    </td>

                    {/* Building name */}
                    <td className="td font-semibold max-w-[180px]" style={{ color: 'var(--ai-rouge)' }}>
                      <span className="flex items-center gap-1.5">
                        {inelig && (
                          <Ban className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }}
                            title={b.eligibility.reason === 'manual' ? 'Manually ineligible' : `Donor: ${b.eligibility.donor}`} />
                        )}
                        {hasGap && !inelig && (
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#d97706' }}
                            title="Missing data" />
                        )}
                        <span className="truncate">{b.name}</span>
                      </span>
                    </td>

                    {/* Type */}
                    <td className="td">
                      <span className="badge"
                        style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)' }}>
                        {b.typology}
                      </span>
                    </td>

                    {/* City */}
                    <td className="td" style={{ color: 'var(--ai-noir70)' }}>
                      {b.governorate || '—'}
                    </td>

                    {/* Area */}
                    <td className={`td text-right ${b.gaps.includes('area') ? 'data-gap' : ''}`}>
                      <GapCell value={b.area} field="area" typology={b.typology} />
                    </td>

                    {/* EUI */}
                    <td className={`td text-right ${b.gaps.includes('baselineEUI') ? 'data-gap' : ''}`}>
                      <GapCell value={b.baselineEUI} field="baselineEUI" typology={b.typology} unit=" kWh/m²" />
                    </td>

                    {/* Energy gain */}
                    <td className="td text-right font-bold" style={{ color: eligible ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
                      {gain != null ? `${gain.toFixed(1)}%` : '—'}
                    </td>

                    {/* PEEB Grant */}
                    <td className="td text-right font-semibold" style={{ color: 'var(--ai-violet)' }}>
                      {grantDisplay}
                    </td>

                    {/* Score */}
                    <td className="td">
                      <ScoreBadge score={score} />
                    </td>

                    {/* Action */}
                    <td className="td">
                      <button
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--ai-noir70)' }}
                        onClick={e => { e.stopPropagation(); selectBuilding(b.id); }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'var(--ai-rouge)';
                          e.currentTarget.style.background = 'var(--ai-rouge-clair)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--ai-noir70)';
                          e.currentTarget.style.background = '';
                        }}
                        title="Open profile"
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

        {/* Table footer */}
        <div
          className="px-4 py-2.5 text-xs flex items-center gap-4"
          style={{ borderTop: '1px solid var(--ai-gris)', background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}
        >
          <span>
            <strong>{filtered.length}</strong> / <strong>{buildings.length}</strong> buildings
            {search && ` · filter: "${search}"`}
          </span>
          <span className="ml-auto flex items-center gap-3 text-xs">
            <span>Score: </span>
            {[{ label: '≥70', bg: '#22a05a' }, { label: '40–69', bg: '#d97706' }, { label: '<40', bg: 'var(--ai-rouge)' }].map(s => (
              <span key={s.label} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.bg }} />
                {s.label}
              </span>
            ))}
          </span>
        </div>
      </div>

      {showImport && (
        <EdgeImportModal onClose={() => setShowImport(false)} onImport={addBuildings} />
      )}
    </div>
  );
}
