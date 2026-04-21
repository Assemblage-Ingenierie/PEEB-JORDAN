import { useState, useMemo, useEffect } from 'react';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight,
  Upload, AlertTriangle, Ban, ChevronDown,
  Layers, Square, Wind, Lightbulb, Sun, Droplets,
  Building2, ShieldCheck, GripVertical, Check,
  Plus, FileSpreadsheet, Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency, parseEdgeExport, calculateScore,
  MEASURE_META, MEASURE_KEYS_EE, MEASURE_KEYS_GR,
} from '../../engine/CalculationEngine';
import UploadBuildingsDialog from './UploadBuildingsDialog';
import { exportBuildings } from '../../utils/excelIO';

// ─── Jordan region mapping ────────────────────────────────────────────────────
const JORDAN_REGIONS = {
  Amman: 'Central', Zarqa: 'Central', Madaba: 'Central', Salt: 'Central', Balqa: 'Central',
  Irbid: 'North',   Mafraq: 'North',  Ajloun: 'North',   Jerash: 'North',
  Aqaba: 'South',   Karak: 'South',   Tafilah: 'South',  "Ma'an": 'South',
};
const getRegion = (gov) => JORDAN_REGIONS[gov] || '—';

const TYPOLOGIES = ['All', 'School', 'Hospital', 'Office', 'Municipality', 'University'];
const REGIONS    = ['All', 'North', 'Central', 'South'];

// ─── Icon map for measure columns ─────────────────────────────────────────────
const MEASURE_ICONS = {
  insulation: Layers, windows: Square, hvac: Wind, lighting: Lightbulb,
  pv: Sun, solarThermal: Droplets,
  structure: Building2, accessibility: Building2, hygieneAndSecurity: ShieldCheck,
};

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

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const bg = score >= 70 ? '#22a05a' : score >= 40 ? '#d97706' : 'var(--ai-rouge)';
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold"
      style={{ background: bg, width: 32, height: 18, fontSize: 10 }}
    >
      {score}
    </span>
  );
}

// ─── Filter dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ value, onChange, options }) {
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

// ─── Column definitions ──────────────────────────────────────────────────────
// Each column: { key, label, width, sortable, type: 'meta'|'measure', measureKey?, render(b, ctx) => ReactNode }
function buildColumns(params) {
  const toDisp = jod => params.currency === 'EUR' ? +(jod * params.exchangeRate).toFixed(0) : jod;
  const fmtAmount = (jod) => {
    if (!jod) return '—';
    return formatCurrency(toDisp(jod), params.currency, true);
  };

  const metaCols = [
    { key: 'id',            label: 'ID',           width: 56,  sortable: true,  type: 'meta',
      render: b => <span className="font-mono" style={{ color: 'var(--ai-noir70)' }}>{b.id}</span> },
    { key: 'peebStatus',    label: 'PEEB',         width: 52,  sortable: true,  type: 'meta', align: 'center',
      render: b => b.peebSelected && !b.eligibility.ineligible
        ? (
          <span
            className="inline-flex items-center justify-center text-white font-black rounded-full px-1.5"
            style={{ background: 'var(--ai-rouge)', fontSize: 9, letterSpacing: '.05em', height: 16, minWidth: 38 }}
            title="Selected for PEEB programme"
          >
            PEEB
          </span>
        )
        : <span style={{ color: 'var(--ai-gris)' }}>—</span> },
    { key: 'name',          label: 'Building',     width: 200, sortable: true,  type: 'meta',
      render: (b) => (
        <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--ai-rouge)' }}>
          {b.eligibility.ineligible && (
            <Ban className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }}
              title={b.eligibility.reason === 'manual' ? 'Manually ineligible' : `Donor: ${b.eligibility.donor}`} />
          )}
          {b.gaps.length > 0 && !b.eligibility.ineligible && (
            <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} title="Missing data" />
          )}
          <span className="truncate" title={b.name}>{b.name}</span>
        </span>
      )
    },
    { key: 'typology',      label: 'Type',         width: 110, sortable: true,  type: 'meta',
      render: b => (
        <span className="badge" style={{ background: 'var(--ai-rouge-clair)', color: 'var(--ai-rouge)', fontSize: 10 }}>
          {b.typology}
        </span>
      ) },
    { key: 'governorate',   label: 'City',         width: 95,  sortable: true,  type: 'meta',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{b.governorate || '—'}</span> },
    { key: 'region',        label: 'Region',       width: 75,  sortable: false, type: 'meta',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{getRegion(b.governorate)}</span> },
    { key: 'area',          label: 'Area m²',      width: 80,  sortable: true,  type: 'meta', align: 'right',
      render: b => b.area ? b.area.toLocaleString() : <span className="data-gap text-xs px-1 rounded">—</span> },
    { key: 'floors',        label: 'Floors',       width: 55,  sortable: true,  type: 'meta', align: 'right',
      render: b => b.floors ?? '—' },
    { key: 'yearBuilt',     label: 'Year',         width: 55,  sortable: true,  type: 'meta', align: 'right',
      render: b => b.yearBuilt ?? '—' },
    { key: 'baselineEUI',   label: 'EUI',          width: 105, sortable: true,  type: 'meta', align: 'right',
      twoLineHeader: 'kWh/m²/yr',
      render: b => {
        if (!b.baselineEUI) return <span className="data-gap text-xs px-1 rounded">—</span>;
        const after = b.calc?.energyGain != null
          ? +(b.baselineEUI * (1 - b.calc.energyGain / 100)).toFixed(0)
          : null;
        return (
          <span className="inline-flex items-center gap-1" style={{ lineHeight: 1.1, justifyContent: 'flex-end' }}>
            <span style={{ color: 'var(--ai-noir70)' }}>{b.baselineEUI}</span>
            <ArrowRight className="w-3 h-3" style={{ color: 'var(--ai-gris)' }} />
            <span className="font-bold" style={{ color: after != null && after < b.baselineEUI ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
              {after != null ? after : b.baselineEUI}
            </span>
          </span>
        );
      },
      title: 'Baseline EUI → after works (kWh/m²/yr)' },
    { key: 'fundingSource', label: 'Donor',        width: 75,  sortable: true,  type: 'meta',
      render: b => b.fundingSource
        ? <span className="badge" style={{ background: 'var(--ai-gris)', color: 'var(--ai-violet)', fontSize: 10 }}>{b.fundingSource}</span>
        : <span style={{ color: 'var(--ai-noir70)' }}>—</span> },
    { key: 'status',        label: 'Status',       width: 95,  sortable: true,  type: 'meta',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{b.status}</span> },
    { key: 'priority',      label: 'Priority',     width: 75,  sortable: true,  type: 'meta',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{b.priority}</span> },
    { key: 'calc',          label: 'Gain %',       width: 65,  sortable: true,  type: 'meta', align: 'right',
      render: b => {
        const gain = b.calc?.energyGain;
        if (gain == null) return '—';
        const eligible = !b.eligibility.ineligible && gain >= 30;
        return <span className="font-bold" style={{ color: eligible ? 'var(--ai-rouge)' : 'var(--ai-violet)' }}>
          {gain.toFixed(1)}%
        </span>;
      }
    },
    { key: 'capexEE',       label: 'CAPEX EE',     width: 95,  sortable: true,  type: 'meta', align: 'right',
      render: b => <span style={{ color: 'var(--ai-violet)' }}>{fmtAmount(b.calc?._jod?.eeCapex ?? 0)}</span>,
      title: 'Energy-efficiency CAPEX' },
    { key: 'capexGR',       label: 'CAPEX GR',     width: 95,  sortable: true,  type: 'meta', align: 'right',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{fmtAmount(b.calc?._jod?.grCapex ?? 0)}</span>,
      title: 'Global-refurbishment CAPEX' },
    { key: 'peebGrant',     label: 'PEEB Grant',   width: 95,  sortable: true,  type: 'meta', align: 'right',
      render: b => <span className="font-semibold" style={{ color: 'var(--ai-rouge)' }}>
        {fmtAmount(b.calc?._jod?.peebGrant ?? 0)}
      </span>,
      title: 'Potential PEEB Grant'
    },
    { key: 'score',         label: 'Score',        width: 55,  sortable: true,  type: 'meta', align: 'center',
      render: (b, { scoreCfg }) => <ScoreBadge score={calculateScore(b, b.calc, scoreCfg).total} />
    },
  ];

  // Measure columns — one per measure key. Selected → pictogram en rouge.
  const measureCols = [...MEASURE_KEYS_EE, ...MEASURE_KEYS_GR].map(key => ({
    key: `m_${key}`,
    label: MEASURE_META[key].short ?? MEASURE_META[key].label,
    width: 36,
    sortable: false,
    type: 'measure',
    measureKey: key,
    vertical: true,
    align: 'center',
    render: (b) => {
      const m = b.measures?.[key];
      const selected = !!m?.selected;
      const Icon = MEASURE_ICONS[key] || Check;
      return (
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 22, height: 22,
            color: selected ? 'var(--ai-rouge)' : 'var(--ai-gris)',
            opacity: selected ? 1 : 0.55,
          }}
          title={`${MEASURE_META[key].label}${selected ? ' — planned' : ''}${m?.notes ? `\n${m.notes}` : ''}`}
        >
          <Icon className="w-4 h-4" strokeWidth={selected ? 2.5 : 1.75} />
        </span>
      );
    }
  }));

  return [...metaCols, ...measureCols];
}

// ─── Sortable, draggable header ───────────────────────────────────────────────
function HeaderCell({ col, sortState, onSort, onDragStart, onDragOver, onDrop, isDragTarget }) {
  const active = sortState.col === col.key;
  const Icon   = active ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      draggable
      onDragStart={e => onDragStart(e, col.key)}
      onDragOver={e => { e.preventDefault(); onDragOver(col.key); }}
      onDrop={e => { e.preventDefault(); onDrop(col.key); }}
      className="th select-none"
      style={{
        color: 'white',
        cursor: col.sortable ? 'pointer' : 'grab',
        whiteSpace: 'nowrap',
        width: col.width,
        minWidth: col.width,
        maxWidth: col.width,
        padding: col.vertical ? '4px 2px' : '6px 8px',
        textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
        borderLeft: isDragTarget ? '2px solid var(--ai-rouge)' : 'none',
        background: isDragTarget ? 'rgba(255,255,255,.12)' : 'transparent',
        verticalAlign: col.vertical ? 'bottom' : 'middle',
        height: col.vertical ? 110 : 'auto',
      }}
      onClick={() => col.sortable && onSort(col.key)}
      title={col.title ?? col.label}
    >
      {col.vertical ? (
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 10,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            fontWeight: 600,
            margin: '0 auto',
          }}
        >
          {col.label}
        </div>
      ) : (
        <div className="flex flex-col" style={{ alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
          <span className="flex items-center gap-1">
            <GripVertical className="w-3 h-3 opacity-30 flex-shrink-0" />
            <span>{col.label}</span>
            {col.sortable && (
              <Icon className="w-3 h-3 flex-shrink-0"
                style={{ color: active ? 'var(--ai-rouge)' : 'rgba(255,255,255,.35)' }} />
            )}
          </span>
          {col.twoLineHeader && (
            <span
              className="font-normal"
              style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', textTransform: 'none', letterSpacing: 0 }}
            >
              {col.twoLineHeader}
            </span>
          )}
        </div>
      )}
    </th>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export default function BuildingInventory() {
  const { buildings, selectBuilding, addBuildings, navigate, params } = useApp();

  const [search,         setSearch]         = useState('');
  const [typologyFilter, setTypologyFilter] = useState('All');
  const [cityFilter,     setCityFilter]     = useState('All');
  const [regionFilter,   setRegionFilter]   = useState('All');
  const [sort,           setSort]           = useState({ col: 'name', dir: 'asc' });
  const [showImport,     setShowImport]     = useState(false);
  const [showUpload,     setShowUpload]     = useState(false);

  const allColumns = useMemo(() => buildColumns(params), [params]);

  // Column order state — stores array of keys
  const [columnOrder, setColumnOrder] = useState(() => allColumns.map(c => c.key));
  const [dragKey, setDragKey] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  // Keep columnOrder in sync if new columns appear (e.g. after adding a measure)
  useEffect(() => {
    setColumnOrder(prev => {
      const known = new Set(prev);
      const missing = allColumns.filter(c => !known.has(c.key)).map(c => c.key);
      return missing.length ? [...prev, ...missing] : prev;
    });
  }, [allColumns.length]);

  const columns = columnOrder
    .map(k => allColumns.find(c => c.key === k))
    .filter(Boolean);

  const handleSort = (col) =>
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const handleDragStart = (e, key) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (key) => {
    if (key !== dragTarget) setDragTarget(key);
  };
  const handleDrop = (targetKey) => {
    if (!dragKey || dragKey === targetKey) { setDragKey(null); setDragTarget(null); return; }
    setColumnOrder(prev => {
      const next = prev.filter(k => k !== dragKey);
      const idx  = next.indexOf(targetKey);
      next.splice(idx, 0, dragKey);
      return next;
    });
    setDragKey(null);
    setDragTarget(null);
  };

  // Derive unique city list from data
  const cities = useMemo(() => [
    'All',
    ...[...new Set(buildings.map(b => b.governorate).filter(Boolean))].sort(),
  ], [buildings]);

  const filtered = useMemo(() => {
    return buildings
      .filter(b => !b.isDraft)
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
        } else if (sort.col === 'capexEE') {
          va = a.calc?._jod?.eeCapex ?? 0;
          vb = b.calc?._jod?.eeCapex ?? 0;
        } else if (sort.col === 'capexGR') {
          va = a.calc?._jod?.grCapex ?? 0;
          vb = b.calc?._jod?.grCapex ?? 0;
        } else if (sort.col === 'peebStatus') {
          va = a.peebSelected && !a.eligibility.ineligible ? 1 : 0;
          vb = b.peebSelected && !b.eligibility.ineligible ? 1 : 0;
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
  }, [buildings, search, typologyFilter, cityFilter, regionFilter, sort, params.scoreConfig]);

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
        <FilterDropdown value={typologyFilter} onChange={setTypologyFilter}
          options={TYPOLOGIES.map(t => ({ value: t, label: t === 'All' ? 'All typologies' : t }))} />
        <FilterDropdown value={cityFilter} onChange={setCityFilter}
          options={cities.map(c => ({ value: c, label: c === 'All' ? 'All cities' : c }))} />
        <FilterDropdown value={regionFilter} onChange={setRegionFilter}
          options={REGIONS.map(r => ({ value: r, label: r === 'All' ? 'All regions' : r }))} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => exportBuildings(buildings.filter(b => !b.isDraft))}
                  className="btn-secondary text-xs"
                  title="Download the full buildings database as Excel">
            <Download className="w-3.5 h-3.5" /> Download Excel
          </button>
          <button onClick={() => setShowImport(true)}
                  className="btn-secondary text-xs"
                  title="Import from an EDGE export (.json / .csv)">
            <Upload className="w-3.5 h-3.5" /> EDGE
          </button>
          <button onClick={() => setShowUpload(true)}
                  className="btn-secondary text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Upload new buildings
          </button>
          <button onClick={() => navigate('new-building')}
                  className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Create new building
          </button>
        </div>
      </div>

      {/* ── Spreadsheet-style table ── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: 'var(--ai-violet)', borderBottom: '2px solid var(--ai-rouge)' }}>
                {columns.map(col => (
                  <HeaderCell key={col.key}
                    col={col}
                    sortState={sort}
                    onSort={handleSort}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragTarget={dragTarget === col.key && dragKey !== col.key}
                  />
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((b, rowIdx) => {
                const inelig = b.eligibility.ineligible;
                return (
                  <tr
                    key={b.id}
                    className="tr-hover"
                    style={{
                      background: rowIdx % 2 === 0 ? 'white' : 'var(--ai-gris-clair)',
                      opacity: inelig ? 0.6 : 1,
                      borderBottom: '1px solid var(--ai-gris-clair)',
                    }}
                    onClick={() => selectBuilding(b.id)}
                  >
                    {columns.map(col => (
                      <td key={col.key}
                        style={{
                          padding: '3px 6px',
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                          textAlign: col.align ?? 'left',
                          fontSize: 12,
                          lineHeight: 1.25,
                          color: '#1a1a1a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.render(b, { scoreCfg: params.scoreConfig })}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div
          className="px-4 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5"
          style={{ borderTop: '1px solid var(--ai-gris)', background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}
        >
          <span>
            <strong>{filtered.length}</strong> / <strong>{buildings.filter(b => !b.isDraft).length}</strong> buildings
            {search && ` · filter: "${search}"`}
          </span>

          <span className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: 'var(--ai-noir70)' }}>
            <span><strong style={{ color: 'var(--ai-violet)' }}>EE</strong> = Energy Efficiency</span>
            <span><strong style={{ color: 'var(--ai-violet)' }}>GR</strong> = Global Refurbishment</span>
            <span><strong style={{ color: 'var(--ai-violet)' }}>EUI</strong> = Energy Use Intensity (kWh/m²/yr)</span>
          </span>

          <span className="ml-auto flex items-center gap-3 text-xs">
            <span>Score: </span>
            {[{ label: '≥70', bg: '#22a05a' }, { label: '40–69', bg: '#d97706' }, { label: '<40', bg: 'var(--ai-rouge)' }].map(s => (
              <span key={s.label} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.bg }} />
                {s.label}
              </span>
            ))}
            <span className="flex items-center gap-1 ml-2">
              <span
                className="inline-flex items-center justify-center text-white font-black rounded-full px-1.5"
                style={{ background: 'var(--ai-rouge)', fontSize: 8, letterSpacing: '.05em', height: 13, minWidth: 30 }}
              >
                PEEB
              </span>
              <span>Selected</span>
            </span>
            <span className="ml-2" style={{ fontStyle: 'italic' }}>
              Drag column headers to reorder · click a row to open
            </span>
          </span>
        </div>
      </div>

      {showImport && (
        <EdgeImportModal onClose={() => setShowImport(false)} onImport={addBuildings} />
      )}

      <UploadBuildingsDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
