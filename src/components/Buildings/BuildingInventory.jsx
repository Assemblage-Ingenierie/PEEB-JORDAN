import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  Upload, AlertTriangle, Ban, ChevronDown,
  Layers, Square, Wind, Lightbulb, Sun, Droplets,
  Building2, ShieldCheck, Check, SlidersHorizontal,
  Plus, FileSpreadsheet, Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  parseEdgeExport, calculateScore,
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

// ─── Column sections ──────────────────────────────────────────────────────────
const SECTION_DEFS = [
  {
    key: 'building',
    label: 'Building Data',
    colKeys: ['alerts','id','peebStatus','name','typology','governorate','region','area','floors','yearBuilt'],
  },
  {
    key: 'audit',
    label: 'Audit Data',
    colKeys: ['existingAudit','author','auditDate','euiBefore','euiAfter','euiDiff','fundingSource'],
  },
  {
    key: 'investment',
    label: 'Investment',
    colKeys: [
      'priority','calc','capexEE','capexGR','capexTotal','peebGrant','savingsPerYear','score',
      ...MEASURE_KEYS_EE.map(k => `m_${k}`),
      ...MEASURE_KEYS_GR.map(k => `m_${k}`),
    ],
  },
];
const ALL_COL_KEYS = SECTION_DEFS.flatMap(s => s.colKeys);

// ─── Typology display config ──────────────────────────────────────────────────
const TYPOLOGY_DISPLAY = {
  Hospital:     { label: 'Hospital',       bg: '#fee2e2', color: '#b91c1c' },
  School:       { label: 'School',         bg: '#dbeafe', color: '#1d4ed8' },
  University:   { label: 'University',     bg: '#ede9fe', color: '#7c3aed' },
  Municipality: { label: 'Administration', bg: '#fef9c3', color: '#854d0e' },
  Office:       { label: 'Administration', bg: '#fef9c3', color: '#854d0e' },
};

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
    <span className="inline-flex items-center justify-center rounded-full text-white font-bold"
      style={{ background: bg, width: 32, height: 18, fontSize: 10 }}>
      {score}
    </span>
  );
}

// ─── Columns visibility dropdown ──────────────────────────────────────────────
function ColumnsDropdown({ visibleCols, onToggle, sectionsWithCols }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-secondary text-xs flex items-center gap-1.5"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Columns
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-xl shadow-xl z-50 overflow-y-auto"
          style={{ background: 'white', border: '1px solid var(--ai-gris)', minWidth: 210, maxHeight: 420 }}
        >
          {sectionsWithCols.map((section, si) => (
            <div key={section.key}>
              {si > 0 && <div style={{ height: 1, background: '#e5e7eb' }} />}
              <div
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                style={{ background: '#f5f5f7', color: 'var(--ai-violet)', position: 'sticky', top: 0 }}
              >
                {section.label}
              </div>
              {section.cols
                .filter(col => col.key !== 'alerts')
                .map(col => {
                  const label = typeof col.label === 'string'
                    ? col.label.replace(/\n/g, ' ')
                    : col.label;
                  return (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-gray-50"
                      style={{ color: '#1a1a1a' }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => onToggle(col.key)}
                        style={{ accentColor: 'var(--ai-violet)', cursor: 'pointer' }}
                      />
                      {label}
                    </label>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column filter cell (header row 3) ───────────────────────────────────────
function FilterCell({ col, value, onChange, dynOptions, isSectionStart }) {
  const cellStyle = {
    background: '#1e2030',
    padding: col.filterable ? '2px 4px' : 0,
    height: 26,
    width: col.width,
    minWidth: col.width,
    maxWidth: col.width,
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255,255,255,.08)',
    borderLeft: isSectionStart ? '2px solid rgba(255,255,255,.3)' : undefined,
  };
  const inputStyle = {
    fontSize: 10, background: 'rgba(255,255,255,.88)', color: '#1e2030',
    border: '1px solid rgba(255,255,255,.3)', borderRadius: 3,
    padding: '1px 4px', width: '100%', outline: 'none', boxSizing: 'border-box',
  };

  if (!col.filterable) return <th style={cellStyle} />;

  const opts = col.filterOptions ?? dynOptions?.[col.key] ?? [];

  if (col.filterType === 'select') {
    return (
      <th style={cellStyle}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
          <option value="">—</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </th>
    );
  }

  return (
    <th style={cellStyle}>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="…" style={inputStyle} onClick={e => e.stopPropagation()} />
    </th>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
function buildColumns(params) {
  const fmtM = (jod) => {
    if (!jod) return '—';
    const val = params.currency === 'EUR' ? +(jod * params.exchangeRate).toFixed(0) : jod;
    const sym = params.currency === 'EUR' ? 'M€' : 'MJOD';
    return (val / 1_000_000).toFixed(3) + ' ' + sym;
  };

  const metaCols = [
    // ── Building Data ─────────────────────────────────────────────────────────
    {
      key: 'alerts', label: '', width: 36, sortable: false, type: 'meta', align: 'center',
      render: b => (
        <span className="inline-flex items-center justify-center gap-0.5">
          {b.gaps.length > 0 && (
            <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: '#d97706' }} title="Missing data" />
          )}
        </span>
      ),
    },
    {
      key: 'id', label: 'ID', width: 56, sortable: true, type: 'meta',
      filterable: true, filterType: 'text',
      render: b => <span className="font-mono" style={{ color: 'var(--ai-noir70)' }}>{b.id}</span>,
    },
    {
      key: 'peebStatus', label: 'PEEB', width: 52, sortable: true, type: 'meta', align: 'center',
      filterable: true, filterType: 'select', filterOptions: ['PEEB', 'Ineligible'],
      render: b => {
        if (b.eligibility.ineligible)
          return <Ban className="w-3.5 h-3.5 mx-auto" style={{ color: 'var(--ai-rouge)' }}
            title={b.eligibility.reason === 'donor' ? `Donor funding: ${b.eligibility.donor}` : 'Manually ineligible'} />;
        if (b.peebSelected)
          return <span className="inline-flex items-center justify-center text-white font-black rounded-full px-1.5"
            style={{ background: '#22c9a5', fontSize: 9, letterSpacing: '.05em', height: 16, minWidth: 38 }}
            title="Selected for PEEB programme">PEEB</span>;
        return <span style={{ color: 'var(--ai-gris)' }}>—</span>;
      },
    },
    {
      key: 'name', label: 'Building', width: 200, sortable: true, type: 'meta',
      filterable: true, filterType: 'text',
      render: b => (
        <span className="font-semibold truncate" style={{ color: '#1a1a1a' }} title={b.name}>
          {b.name}
        </span>
      ),
    },
    {
      key: 'typology', label: 'Type', width: 110, sortable: true, type: 'meta', align: 'center',
      filterable: true, filterType: 'select',
      filterOptions: ['School', 'Hospital', 'University', 'Administration'],
      render: b => {
        const d = TYPOLOGY_DISPLAY[b.typology] || { label: b.typology, bg: 'var(--ai-gris-clair)', color: 'var(--ai-violet)' };
        return <span className="badge" style={{ background: d.bg, color: d.color, fontSize: 10 }}>{d.label}</span>;
      },
    },
    {
      key: 'governorate', label: 'Governorate', width: 100, sortable: true, type: 'meta',
      filterable: true, filterType: 'select', filterOptions: null,
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{b.governorate || '—'}</span>,
    },
    {
      key: 'region', label: 'Region', width: 75, sortable: false, type: 'meta',
      filterable: true, filterType: 'select', filterOptions: ['North', 'Central', 'South'],
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{getRegion(b.governorate)}</span>,
    },
    {
      key: 'area', label: 'Area m²', width: 80, sortable: true, type: 'meta', align: 'right',
      render: b => b.area ? b.area.toLocaleString() : <span className="data-gap text-xs px-1 rounded">—</span>,
    },
    {
      key: 'floors', label: 'Floors', width: 50, sortable: true, type: 'meta', align: 'center',
      render: b => b.floors ?? '—',
    },
    {
      key: 'yearBuilt', label: 'Year', width: 55, sortable: true, type: 'meta', align: 'center',
      render: b => b.yearBuilt ?? '—',
    },
    // ── Audit Data ────────────────────────────────────────────────────────────
    {
      key: 'existingAudit', label: 'Existing\nAudit', width: 70, sortable: true, type: 'meta', align: 'center',
      title: 'Existing energy audit — edit in building profile',
      render: b => {
        const has = !!b.existingAudit;
        return (
          <span className="inline-flex items-center justify-center"
            style={{ width: 20, height: 20, borderRadius: 3, border: has ? 'none' : '1.5px solid #d1d5db' }}>
            {has && <Check className="w-4 h-4" style={{ color: '#9ca3af' }} />}
          </span>
        );
      },
    },
    {
      key: 'author', label: 'Author', width: 90, sortable: true, type: 'meta',
      filterable: true, filterType: 'text',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{b.auditAuthor || '—'}</span>,
    },
    {
      key: 'auditDate', label: 'Audit\nDate', width: 90, sortable: true, type: 'meta', align: 'center',
      title: 'Date of energy audit — edit in building profile',
      render: b => {
        if (!b.auditDate) return <span style={{ color: 'var(--ai-gris)' }}>—</span>;
        const d = new Date(b.auditDate);
        return <span style={{ color: 'var(--ai-noir70)', fontSize: 11 }}>{d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>;
      },
    },
    {
      key: 'euiBefore', label: 'EUI\nbefore', width: 70, sortable: true, type: 'meta', align: 'right',
      twoLineHeader: 'kWh/m²/yr',
      title: 'Baseline EUI before works',
      render: b => {
        if (!b.baselineEUI) return <span className="data-gap text-xs px-1 rounded">—</span>;
        const isExt = b.source === 'Extrapolated';
        return <span style={{ color: 'var(--ai-noir70)', fontStyle: isExt ? 'italic' : 'normal', opacity: isExt ? 0.7 : 1 }}>{b.baselineEUI}</span>;
      },
    },
    {
      key: 'euiAfter', label: 'EUI\nafter', width: 70, sortable: true, type: 'meta', align: 'right',
      twoLineHeader: 'kWh/m²/yr',
      title: 'EUI after works',
      render: b => {
        if (!b.baselineEUI || b.calc?.energyGain == null) return <span style={{ color: 'var(--ai-gris)' }}>—</span>;
        const after = +(b.baselineEUI * (1 - b.calc.energyGain / 100)).toFixed(0);
        return <span className="font-bold" style={{ color: 'var(--ai-rouge)' }}>{after}</span>;
      },
    },
    {
      key: 'euiDiff', label: 'EUI\ndiff.', width: 70, sortable: true, type: 'meta', align: 'right',
      twoLineHeader: 'kWh/m²/yr',
      title: 'EUI reduction (before − after)',
      render: b => {
        if (!b.baselineEUI || b.calc?.energyGain == null) return <span style={{ color: 'var(--ai-gris)' }}>—</span>;
        const diff = +(b.baselineEUI * b.calc.energyGain / 100).toFixed(0);
        return <span className="font-bold" style={{ color: '#16a34a' }}>−{diff}</span>;
      },
    },
    {
      key: 'fundingSource', label: 'Existing\nFunding', width: 110, sortable: true, type: 'meta',
      filterable: true, filterType: 'text',
      render: b => b.fundingSource
        ? <span className="badge" style={{ background: 'var(--ai-rouge)', color: 'white', fontSize: 10, fontWeight: 700 }}>{b.fundingSource}</span>
        : <span style={{ color: 'var(--ai-gris)' }}>—</span>,
    },
    // ── Investment ────────────────────────────────────────────────────────────
    {
      key: 'priority', label: 'Political\nPriority', width: 90, sortable: true, type: 'meta',
      filterable: true, filterType: 'select', filterOptions: ['High', 'Medium', 'Low'],
      render: b => b.priority === 'High'
        ? <span className="badge" style={{ background: 'var(--ai-rouge)', color: 'white', fontSize: 10 }}>High</span>
        : <span style={{ color: 'var(--ai-noir70)' }}>{b.priority || '—'}</span>,
    },
    {
      key: 'calc', label: 'Gain %', width: 65, sortable: true, type: 'meta', align: 'center',
      render: b => {
        const gain = b.calc?.energyGain;
        if (gain == null) return <span style={{ color: 'var(--ai-gris)' }}>—</span>;
        const TIER_GREY = { slate: '#c0c0c0', amber: '#989898', blue: '#606060', green: '#303030', purple: '#101010' };
        const grey = TIER_GREY[b.calc?.tier?.color ?? 'slate'];
        return (
          <span className="font-bold" style={{ color: grey }} title={b.calc?.tier?.label ?? ''}>
            {gain.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'capexEE', label: 'CAPEX\nEE', width: 95, sortable: true, type: 'meta', align: 'right',
      title: 'Energy-efficiency CAPEX',
      render: b => <span style={{ color: 'var(--ai-violet)' }}>{fmtM(b.calc?._jod?.eeCapex ?? 0)}</span>,
    },
    {
      key: 'capexGR', label: 'CAPEX\nGR', width: 95, sortable: true, type: 'meta', align: 'right',
      title: 'Global-refurbishment CAPEX',
      render: b => <span style={{ color: 'var(--ai-noir70)' }}>{fmtM(b.calc?._jod?.grCapex ?? 0)}</span>,
    },
    {
      key: 'capexTotal', label: 'Total\nCAPEX', width: 100, sortable: true, type: 'meta', align: 'right',
      title: 'Total CAPEX (EE + GR)',
      render: b => {
        const total = (b.calc?._jod?.eeCapex ?? 0) + (b.calc?._jod?.grCapex ?? 0);
        return <span className="font-bold" style={{ color: 'var(--ai-rouge)' }}>{fmtM(total)}</span>;
      },
    },
    {
      key: 'peebGrant', label: 'Expected\nPEEB Grant', width: 120, sortable: true, type: 'meta', align: 'right',
      title: 'Expected PEEB Grant',
      render: b => <span className="font-bold" style={{ color: '#1a1a1a' }}>{fmtM(b.calc?._jod?.peebGrant ?? 0)}</span>,
    },
    {
      key: 'savingsPerYear', label: 'Savings /\nyear', width: 95, sortable: false, type: 'meta', align: 'right',
      render: () => <span style={{ color: 'var(--ai-gris)' }}>—</span>,
    },
    {
      key: 'score', label: 'Score', width: 55, sortable: true, type: 'meta', align: 'center',
      render: (b, { scoreCfg }) => <ScoreBadge score={calculateScore(b, b.calc, scoreCfg).total} />,
    },
  ];

  const eeMeasureCols = MEASURE_KEYS_EE.map(key => ({
    key: `m_${key}`,
    label: MEASURE_META[key].short ?? MEASURE_META[key].label,
    width: 36, sortable: false, type: 'measure', measureKey: key, vertical: true, align: 'center',
    render: b => {
      const m = b.measures?.[key];
      const selected = !!m?.selected;
      const Icon = MEASURE_ICONS[key] || Check;
      return (
        <span className="inline-flex items-center justify-center"
          style={{ width: 22, height: 22, color: selected ? 'var(--ai-rouge)' : 'var(--ai-gris)', opacity: selected ? 1 : 0.5 }}
          title={`${MEASURE_META[key].label}${selected ? ' — planned' : ''}${m?.notes ? `\n${m.notes}` : ''}`}>
          <Icon className="w-4 h-4" strokeWidth={selected ? 2.5 : 1.75} />
        </span>
      );
    },
  }));

  const grMeasureCols = MEASURE_KEYS_GR.map(key => ({
    key: `m_${key}`,
    label: MEASURE_META[key].short ?? MEASURE_META[key].label,
    width: 36, sortable: false, type: 'measure', measureKey: key, vertical: true, align: 'center',
    render: b => {
      const m = b.measures?.[key];
      const selected = !!m?.selected;
      const Icon = MEASURE_ICONS[key] || Check;
      return (
        <span className="inline-flex items-center justify-center"
          style={{ width: 22, height: 22, color: selected ? '#1a1a1a' : 'var(--ai-gris)', opacity: selected ? 1 : 0.45 }}
          title={`${MEASURE_META[key].label}${selected ? ' — planned' : ''}${m?.notes ? `\n${m.notes}` : ''}`}>
          <Icon className="w-4 h-4" strokeWidth={selected ? 2.5 : 1.75} />
        </span>
      );
    },
  }));

  return { metaCols, eeMeasureCols, grMeasureCols };
}

// ─── Sortable header cell ─────────────────────────────────────────────────────
function HeaderCell({ col, sortState, onSort, isSectionStart }) {
  const active = sortState.col === col.key;
  const Icon   = active ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      className="th select-none"
      style={{
        color: 'white',
        cursor: col.sortable ? 'pointer' : 'default',
        whiteSpace: col.vertical ? 'nowrap' : 'normal',
        width: col.width, minWidth: col.width, maxWidth: col.width,
        padding: col.vertical ? '4px 2px' : '6px 8px',
        textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
        borderLeft: isSectionStart ? '2px solid rgba(255,255,255,.4)' : undefined,
        verticalAlign: col.vertical ? 'bottom' : 'middle',
        height: col.vertical ? 80 : 'auto',
      }}
      onClick={() => col.sortable && onSort(col.key)}
      title={col.title ?? col.label}
    >
      {col.vertical ? (
        <div style={{
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, margin: '0 auto',
        }}>
          {col.label}
        </div>
      ) : (
        <div className="flex flex-col" style={{ alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
          <span className="flex items-center gap-1">
            <span style={{ whiteSpace: 'pre-line', lineHeight: 1.25 }}>{col.label}</span>
            {col.sortable && (
              <Icon className="w-3 h-3 flex-shrink-0"
                style={{ color: active ? 'var(--ai-rouge)' : 'rgba(255,255,255,.35)' }} />
            )}
          </span>
          {col.twoLineHeader && (
            <span className="font-normal" style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', textTransform: 'none', letterSpacing: 0 }}>
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
  const { buildings, selectBuilding, addBuildings, navigate, params, updateBuilding } = useApp();

  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState({ col: 'name', dir: 'asc' });
  const [showImport,  setShowImport]  = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [colFilters,  setColFilters]  = useState({});
  const [visibleCols, setVisibleCols] = useState(() => new Set(ALL_COL_KEYS));

  const { metaCols, eeMeasureCols, grMeasureCols } = useMemo(() => buildColumns(params), [params]);

  const allColsMap = useMemo(() => {
    const map = {};
    [...metaCols, ...eeMeasureCols, ...grMeasureCols].forEach(c => { map[c.key] = c; });
    return map;
  }, [metaCols, eeMeasureCols, grMeasureCols]);

  const allDisplayCols = useMemo(() =>
    SECTION_DEFS.flatMap(s =>
      s.colKeys.map(k => allColsMap[k]).filter(col => col && visibleCols.has(col.key))
    ),
  [allColsMap, visibleCols]);

  // Keys of the first visible column in each section (except the first) — get a left border
  const sectionBorderKeys = useMemo(() => {
    const keys = new Set();
    for (let i = 1; i < SECTION_DEFS.length; i++) {
      const first = SECTION_DEFS[i].colKeys.find(k => visibleCols.has(k) && allColsMap[k]);
      if (first) keys.add(first);
    }
    return keys;
  }, [visibleCols, allColsMap]);

  const visibleSections = useMemo(() =>
    SECTION_DEFS
      .map(s => ({ ...s, span: s.colKeys.filter(k => visibleCols.has(k) && allColsMap[k]).length }))
      .filter(s => s.span > 0),
  [visibleCols, allColsMap]);

  const sectionsWithCols = useMemo(() =>
    SECTION_DEFS.map(s => ({ ...s, cols: s.colKeys.map(k => allColsMap[k]).filter(Boolean) })),
  [allColsMap]);

  const toggleCol = key => {
    if (key === 'alerts') return;
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSort = col =>
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const nonDrafts = useMemo(() => buildings.filter(b => !b.isDraft), [buildings]);

  const dynColOptions = useMemo(() => ({
    governorate: [...new Set(nonDrafts.map(b => b.governorate).filter(Boolean))].sort(),
  }), [nonDrafts]);

  const setColFilter = (key, val) => setColFilters(prev => ({ ...prev, [key]: val }));

  const filtered = useMemo(() => {
    return nonDrafts
      .filter(b => {
        const q = search.toLowerCase();
        if (q && !(
          b.name.toLowerCase().includes(q) ||
          (b.governorate || '').toLowerCase().includes(q) ||
          b.typology.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q)
        )) return false;

        for (const [key, val] of Object.entries(colFilters)) {
          if (!val) continue;
          switch (key) {
            case 'name':          if (!b.name.toLowerCase().includes(val.toLowerCase())) return false; break;
            case 'id':            if (!b.id.toLowerCase().includes(val.toLowerCase())) return false; break;
            case 'typology':
              if (val === 'Administration') { if (b.typology !== 'Municipality' && b.typology !== 'Office') return false; }
              else if (b.typology !== val) return false;
              break;
            case 'governorate':   if (b.governorate !== val) return false; break;
            case 'region':        if (getRegion(b.governorate) !== val) return false; break;
            case 'author':        if (!((b.auditAuthor || '').toLowerCase().includes(val.toLowerCase()))) return false; break;
            case 'fundingSource': if (!((b.fundingSource || '').toLowerCase().includes(val.toLowerCase()))) return false; break;
            case 'priority':      if ((b.priority || '') !== val) return false; break;
            case 'peebStatus':    { const p = b.peebSelected && !b.eligibility.ineligible; if (val === 'PEEB' && !p) return false; break; }
          }
        }
        return true;
      })
      .sort((a, b) => {
        let va, vb;
        switch (sort.col) {
          case 'score':         va = calculateScore(a, a.calc, params.scoreConfig).total; vb = calculateScore(b, b.calc, params.scoreConfig).total; break;
          case 'calc':          va = a.calc?.energyGain ?? 0;   vb = b.calc?.energyGain ?? 0; break;
          case 'euiBefore':     va = a.baselineEUI ?? 0;        vb = b.baselineEUI ?? 0; break;
          case 'euiAfter':      va = a.baselineEUI && a.calc?.energyGain != null ? a.baselineEUI * (1 - a.calc.energyGain / 100) : 0; vb = b.baselineEUI && b.calc?.energyGain != null ? b.baselineEUI * (1 - b.calc.energyGain / 100) : 0; break;
          case 'euiDiff':       va = a.baselineEUI && a.calc?.energyGain != null ? a.baselineEUI * a.calc.energyGain / 100 : 0; vb = b.baselineEUI && b.calc?.energyGain != null ? b.baselineEUI * b.calc.energyGain / 100 : 0; break;
          case 'peebGrant':     va = a.calc?._jod?.peebGrant ?? 0; vb = b.calc?._jod?.peebGrant ?? 0; break;
          case 'capexEE':       va = a.calc?._jod?.eeCapex ?? 0;   vb = b.calc?._jod?.eeCapex ?? 0; break;
          case 'capexGR':       va = a.calc?._jod?.grCapex ?? 0;   vb = b.calc?._jod?.grCapex ?? 0; break;
          case 'capexTotal':    va = (a.calc?._jod?.eeCapex ?? 0) + (a.calc?._jod?.grCapex ?? 0); vb = (b.calc?._jod?.eeCapex ?? 0) + (b.calc?._jod?.grCapex ?? 0); break;
          case 'peebStatus':    va = a.peebSelected && !a.eligibility.ineligible ? 1 : 0; vb = b.peebSelected && !b.eligibility.ineligible ? 1 : 0; break;
          case 'existingAudit': va = a.existingAudit ? 1 : 0; vb = b.existingAudit ? 1 : 0; break;
          case 'author':        va = a.auditAuthor ?? ''; vb = b.auditAuthor ?? ''; break;
          case 'auditDate':     va = a.auditDate ?? ''; vb = b.auditDate ?? ''; break;
          default:              va = a[sort.col] ?? ''; vb = b[sort.col] ?? '';
        }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sort.dir === 'asc' ? -1 : 1;
        if (va > vb) return sort.dir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [nonDrafts, search, sort, params.scoreConfig, colFilters]);

  return (
    <div className="space-y-4 fade-in">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ai-noir70)' }} />
          <input className="input pl-9" placeholder="Search by name, type, city…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <ColumnsDropdown
          visibleCols={visibleCols}
          onToggle={toggleCol}
          sectionsWithCols={sectionsWithCols}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => exportBuildings(nonDrafts)} className="btn-secondary text-xs"
            title="Download the full buildings database as Excel">
            <Download className="w-3.5 h-3.5" /> Download Excel
          </button>
          <button onClick={() => setShowImport(true)} className="btn-secondary text-xs"
            title="Import from an EDGE export (.json / .csv)">
            <Upload className="w-3.5 h-3.5" /> EDGE
          </button>
          <button onClick={() => setShowUpload(true)} className="btn-secondary text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Upload new buildings
          </button>
          <button onClick={() => navigate('new-building')} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Create new building
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>

              {/* Row 0: section labels */}
              <tr style={{ background: 'var(--ai-violet)' }}>
                {visibleSections.map((s, si) => (
                  <th
                    key={s.key}
                    colSpan={s.span}
                    style={{
                      textAlign: 'center',
                      padding: '4px 8px',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,.7)',
                      borderLeft: si > 0 ? '2px solid rgba(255,255,255,.35)' : 'none',
                      borderBottom: '1px solid rgba(255,255,255,.12)',
                    }}
                  >
                    {s.label}
                  </th>
                ))}
              </tr>

              {/* Row 1: column headers */}
              <tr style={{ background: 'var(--ai-violet)', borderBottom: '2px solid var(--ai-rouge)' }}>
                {allDisplayCols.map(col => (
                  <HeaderCell key={col.key} col={col} sortState={sort} onSort={handleSort}
                    isSectionStart={sectionBorderKeys.has(col.key)} />
                ))}
              </tr>

              {/* Row 2: column filters */}
              <tr>
                {allDisplayCols.map(col => (
                  <FilterCell key={col.key} col={col}
                    value={colFilters[col.key] || ''}
                    onChange={val => setColFilter(col.key, val)}
                    dynOptions={dynColOptions}
                    isSectionStart={sectionBorderKeys.has(col.key)} />
                ))}
              </tr>

            </thead>

            <tbody>
              {filtered.map(b => {
                const inelig = b.eligibility.ineligible;
                return (
                  <tr key={b.id} className="tr-hover" style={{ cursor: 'pointer' }}
                    onClick={() => selectBuilding(b.id)}>
                    {allDisplayCols.map(col => (
                      <td key={col.key} style={{
                        padding: '3px 6px',
                        width: col.width, minWidth: col.width, maxWidth: col.width,
                        textAlign: col.align ?? 'left',
                        fontSize: 12, lineHeight: 1.25, color: '#1a1a1a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        background: inelig ? 'var(--ai-gris-clair)' : 'white',
                        borderBottom: '1px solid #e5e7eb',
                        borderLeft: sectionBorderKeys.has(col.key) ? '2px solid #d1d5db' : undefined,
                      }}>
                        {col.render(b, { scoreCfg: params.scoreConfig, updateBuilding })}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5"
          style={{ borderTop: '1px solid var(--ai-gris)', background: 'var(--ai-gris-clair)', color: 'var(--ai-noir70)' }}>
          <span>
            <strong>{filtered.length}</strong> / <strong>{nonDrafts.length}</strong> buildings
            {search && ` · "${search}"`}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span><strong style={{ color: 'var(--ai-violet)' }}>EE</strong> = Energy Efficiency</span>
            <span><strong style={{ color: 'var(--ai-violet)' }}>GR</strong> = Global Refurbishment</span>
            <span><strong style={{ color: 'var(--ai-violet)' }}>EUI</strong> = kWh/m²/yr</span>
            <span><em>Italic EUI</em> = extrapolated</span>
          </span>
          <span className="ml-auto flex items-center gap-3 text-xs">
            <span>Score:</span>
            {[{ label: '≥70', bg: '#22a05a' }, { label: '40–69', bg: '#d97706' }, { label: '<40', bg: 'var(--ai-rouge)' }].map(s => (
              <span key={s.label} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.bg }} />{s.label}
              </span>
            ))}
            <span className="flex items-center gap-1 ml-2">
              <span className="inline-flex items-center justify-center text-white font-black rounded-full px-1.5"
                style={{ background: 'var(--ai-rouge)', fontSize: 8, letterSpacing: '.05em', height: 13, minWidth: 30 }}>
                PEEB
              </span>
              <span>Selected</span>
            </span>
            <span className="ml-2" style={{ fontStyle: 'italic' }}>
              Click row to open
            </span>
          </span>
        </div>
      </div>

      {showImport && <EdgeImportModal onClose={() => setShowImport(false)} onImport={addBuildings} />}
      <UploadBuildingsDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
