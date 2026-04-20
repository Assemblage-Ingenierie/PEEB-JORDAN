/**
 * Excel I/O — download template, export DB, parse uploaded files.
 * Uses xlsx-js-style (npm) for cell styles (fills, fonts, borders).
 */

import XLSX from 'xlsx-js-style';
import {
  MEASURE_KEYS, MEASURE_KEYS_EE, MEASURE_META, TYPOLOGY_DEFAULTS,
} from '../engine/CalculationEngine';

// ─── Brand palette ───────────────────────────────────────────────────────────
// Ported from the Assemblage template, with every red background swapped to
// the dark violet from the app's graphic charter.
const COLOR = {
  violet:       'FF30323E',   // main header bg (was red #E30513)
  violetLight:  'FFEDEBF0',   // Required badge bg (was pink #F9E1E3)
  blueLight:    'FFE6F1FB',   // Optional badge bg
  greyLight:    'FFF2F2F2',   // description bg
  zebra:        'FFFAFAFA',   // alternating data row tint
  white:        'FFFFFFFF',
  black:        'FF000000',
  accentRed:    'FFE30513',   // still used as text accent (logo colour)
  greyMid:      'FF888888',
  greyDark:     'FF666666',
  greyFaint:    'FFAAAAAA',
  borderGrey:   'FFCCCCCC',
};

const BORDER = {
  top:    { style: 'thin', color: { rgb: COLOR.borderGrey } },
  bottom: { style: 'thin', color: { rgb: COLOR.borderGrey } },
  left:   { style: 'thin', color: { rgb: COLOR.borderGrey } },
  right:  { style: 'thin', color: { rgb: COLOR.borderGrey } },
};

// ─── Column schema ───────────────────────────────────────────────────────────
// Building-level identity / meta fields.
// required: shown as red badge on row 3; desc: shown on row 4.
export const META_COLUMNS = [
  { key: 'name',             label: 'Building name',              type: 'text',   required: true,  desc: 'Text — unique name for the building' },
  { key: 'typology',         label: 'Building typology',          type: 'text',   required: true,  desc: 'School / Hospital / Office / Municipality / University' },
  { key: 'governorate',      label: 'Governorate',                type: 'text',   required: true,  desc: 'Jordanian governorate (Amman, Zarqa, Irbid, etc.)' },
  { key: 'region',           label: 'Region',                     type: 'text',   required: false, desc: 'North / Central / South — inferred from governorate if empty' },
  { key: 'address',          label: 'Address',                    type: 'text',   required: false, desc: 'Full street address' },
  { key: 'area',             label: 'Floor area (m²)',            type: 'number', required: true,  desc: 'Total floor area in square meters' },
  { key: 'yearBuilt',        label: 'Year built',                 type: 'number', required: false, desc: 'Year of construction' },
  { key: 'floors',           label: 'Number of floors',           type: 'number', required: false, desc: 'Number of above-ground floors' },
  { key: 'baselineEUI',      label: 'Baseline EUI (kWh/m²/yr)',   type: 'number', required: false, desc: 'Energy Use Intensity — if empty, uses typology default' },
  { key: 'operatingHours',   label: 'Operating hours',            type: 'text',   required: false, desc: 'Typical weekly operating schedule' },
  { key: 'lat',              label: 'Latitude',                   type: 'number', required: false, desc: 'GPS latitude (decimal degrees)' },
  { key: 'lng',              label: 'Longitude',                  type: 'number', required: false, desc: 'GPS longitude (decimal degrees)' },
  { key: 'fundingSource',    label: 'Existing funding source',    type: 'text',   required: false, desc: 'Free text (PEEB, AFD, EU, Self, JREEEF…)' },
  { key: 'status',           label: 'Status',                     type: 'text',   required: false, desc: 'Planning / Ongoing / Completed (defaults to Planning)' },
  { key: 'siteObservations', label: 'Site observations',          type: 'text',   required: false, desc: 'Free notes from site visit' },
];

// Per-measure columns — EE measures get capex + savings, all get selected + notes.
export function measureColumns() {
  const cols = [];
  for (const key of MEASURE_KEYS) {
    const meta = MEASURE_META[key];
    const isEE = MEASURE_KEYS_EE.includes(key);
    cols.push({
      key: `${key}_selected`, measure: key, field: 'selected',
      label: meta.short, type: 'boolean', required: false,
      desc: `${meta.short} — Yes / No (1/0, true/false).`,
    });
    cols.push({
      key: `${key}_capex`, measure: key, field: 'capex',
      label: `${meta.short} CAPEX (JOD/m²)`, type: 'number', required: false,
      desc: 'Unit cost in JOD/m². Leave empty to use typology default.',
    });
    if (isEE) {
      cols.push({
        key: `${key}_savings`, measure: key, field: 'savingsRate',
        label: `${meta.short} savings rate`, type: 'number', required: false,
        desc: 'Energy savings fraction between 0 and 1 (e.g. 0.18 = 18%).',
      });
    }
    cols.push({
      key: `${key}_notes`, measure: key, field: 'notes',
      label: `${meta.short} notes`, type: 'text', required: false,
      desc: 'Free text — scope, constraints, brands.',
    });
  }
  return cols;
}

export function allColumns() {
  return [...META_COLUMNS, ...measureColumns()];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slug(s) {
  return String(s || 'building').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function buildIdFrom(name, existingIds) {
  const base = slug(name);
  let id = base, i = 2;
  while (existingIds.has(id)) { id = `${base}-${i++}`; }
  return id;
}

function toBool(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') return /^(y|yes|true|1|x|✓)$/i.test(v.trim());
  return false;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cellRef(r, c) {
  // r,c are 0-based → Excel A1 notation
  let col = '';
  let n = c;
  do { col = String.fromCharCode(65 + (n % 26)) + col; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return `${col}${r + 1}`;
}

// ─── Styling primitives ──────────────────────────────────────────────────────
// Row 1: dev keys — tiny, faint, so users don't touch them.
const STYLE_DEV_KEYS = {
  font: { name: 'Arial', sz: 8, color: { rgb: COLOR.greyFaint } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER,
};

// Row 2: main label — bold white on violet sombre.
const STYLE_MAIN_LABEL = {
  font: { name: 'Arial', sz: 10, bold: true, color: { rgb: COLOR.white } },
  fill: { fgColor: { rgb: COLOR.violet }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER,
};

// Row 3 badges.
const STYLE_REQUIRED = {
  font: { name: 'Arial', sz: 9, bold: true, color: { rgb: COLOR.accentRed } },
  fill: { fgColor: { rgb: COLOR.violetLight }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER,
};

const STYLE_OPTIONAL = {
  font: { name: 'Arial', sz: 9, color: { rgb: COLOR.greyMid } },
  fill: { fgColor: { rgb: COLOR.blueLight }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER,
};

// Row 4: description — italic grey on light grey.
const STYLE_DESCRIPTION = {
  font: { name: 'Arial', sz: 8, italic: true, color: { rgb: COLOR.greyDark } },
  fill: { fgColor: { rgb: COLOR.greyLight }, patternType: 'solid' },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: BORDER,
};

// Data rows — plain with light zebra tint on odd rows.
function styleData(col, isZebra) {
  const s = {
    font: { name: 'Arial', sz: 10, color: { rgb: COLOR.black } },
    alignment: { horizontal: col.type === 'number' ? 'right' : 'left', vertical: 'center' },
    border: BORDER,
  };
  if (isZebra) s.fill = { fgColor: { rgb: COLOR.zebra }, patternType: 'solid' };
  return s;
}

// Sheet-level title style (used in Typology / Instructions sheets).
const STYLE_SHEET_TITLE = {
  font: { name: 'Arial', sz: 14, bold: true, color: { rgb: COLOR.accentRed } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const STYLE_SHEET_SUBTITLE = {
  font: { name: 'Arial', sz: 12, bold: true, color: { rgb: COLOR.accentRed } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const STYLE_SHEET_BODY = {
  font: { name: 'Arial', sz: 10, color: { rgb: COLOR.black } },
  alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
};

// ─── Apply the 4-row header + column widths + freeze pane ───────────────────
function writeHeaderBlock(ws, cols) {
  for (let c = 0; c < cols.length; c++) {
    const col = cols[c];
    const r1 = cellRef(0, c);
    const r2 = cellRef(1, c);
    const r3 = cellRef(2, c);
    const r4 = cellRef(3, c);

    ws[r1] = { t: 's', v: col.key };
    ws[r2] = { t: 's', v: col.label };
    ws[r3] = { t: 's', v: col.required ? 'Required' : 'Optional' };
    ws[r4] = { t: 's', v: col.desc || '' };

    ws[r1].s = STYLE_DEV_KEYS;
    ws[r2].s = STYLE_MAIN_LABEL;
    ws[r3].s = col.required ? STYLE_REQUIRED : STYLE_OPTIONAL;
    ws[r4].s = STYLE_DESCRIPTION;
  }

  ws['!rows'] = [
    { hpt: 12 },   // row 1 (keys) — small
    { hpt: 30 },   // row 2 (main label) — tall
    { hpt: 18 },   // row 3 (badge)
    { hpt: 36 },   // row 4 (description)
  ];

  // Column widths — based on label length, clamped.
  ws['!cols'] = cols.map(c => ({
    wch: Math.max(14, Math.min(34, Math.max(c.label.length, (c.desc || '').length / 3) + 2)),
  }));

  // Freeze below row 4 so data scrolls under a fixed header.
  ws['!freeze'] = { xSplit: 1, ySplit: 4 };
  ws['!views'] = [{ state: 'frozen', xSplit: 1, ySplit: 4 }];
}

// Ensure the sheet's declared !ref spans all cells we populated.
function recomputeRef(ws, nRows, nCols) {
  const X = XLSX;
  ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: nRows - 1, c: nCols - 1 } });
}

// ─── Typology defaults sheet ────────────────────────────────────────────────
function buildTypologySheet() {
  const X = XLSX;
  const keys = MEASURE_KEYS;
  const header = ['Typology', 'Baseline EUI', ...keys.flatMap(k => {
    const s = MEASURE_META[k].short;
    const isEE = MEASURE_KEYS_EE.includes(k);
    return isEE ? [`${s} CAPEX`, `${s} savings`] : [`${s} CAPEX`];
  })];

  const rows = [header];
  for (const [typ, def] of Object.entries(TYPOLOGY_DEFAULTS)) {
    const row = [typ, def.baselineEUI ?? ''];
    for (const k of keys) {
      row.push(def[k]?.capex ?? '');
      if (MEASURE_KEYS_EE.includes(k)) row.push(def[k]?.savingsRate ?? '');
    }
    rows.push(row);
  }

  const ws = X.utils.aoa_to_sheet(rows);
  ws['!cols'] = header.map(h => ({ wch: Math.max(12, h.length + 2) }));
  ws['!rows'] = [{ hpt: 28 }];
  ws['!freeze'] = { xSplit: 1, ySplit: 1 };
  ws['!views']  = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  for (let c = 0; c < header.length; c++) {
    const ref = cellRef(0, c);
    if (ws[ref]) ws[ref].s = STYLE_MAIN_LABEL;
  }
  for (let r = 1; r < rows.length; r++) {
    for (let c = 0; c < header.length; c++) {
      const ref = cellRef(r, c);
      if (!ws[ref]) continue;
      const isZebra = (r % 2) === 0;
      ws[ref].s = styleData({ type: c === 0 ? 'text' : 'number' }, isZebra);
    }
  }
  return ws;
}

// ─── Instructions sheet ─────────────────────────────────────────────────────
function buildInstructionsSheet() {
  const X = XLSX;
  const lines = [
    ['PEEB Med Jordan — Import template'],
    [''],
    ['How to fill the Buildings sheet'],
    ['Row 1 holds the technical column keys. Do not edit — they drive the import.'],
    ['Row 2 holds human-readable labels. Row 3 marks each column as Required or Optional. Row 4 gives a short description.'],
    ['Start entering buildings from row 5, one building per row.'],
    [''],
    ['Required identity fields'],
    ['• name — unique building name, used to generate its ID.'],
    [`• typology — one of: ${Object.keys(TYPOLOGY_DEFAULTS).join(', ')}.`],
    ['• governorate — Jordanian governorate.'],
    ['• area — total floor area in m².'],
    [''],
    ['Optional fields'],
    ['• Empty cells fall back to the typology default (baselineEUI, measure CAPEX / savings).'],
    ['• On import, missing values stay visible in the app and are highlighted as incomplete data.'],
    [''],
    ['Per-measure columns'],
    ['• <measure>_selected — Yes / No / 1 / 0 / true / false.'],
    ['• <measure>_capex — unit cost in JOD/m².'],
    ['• <measure>_savings — savings rate between 0 and 1 (EE measures only).'],
    ['• <measure>_notes — free text.'],
    [''],
    ['See the Typology Defaults sheet for per-typology baselines and measure defaults.'],
  ];
  const ws = X.utils.aoa_to_sheet(lines);
  ws['!cols'] = [{ wch: 110 }];

  // Title / section headings styling.
  ws['A1'].s = STYLE_SHEET_TITLE;
  const sectionRows = [2, 7, 13, 17]; // 0-based indices for "How to fill", "Required identity fields", "Optional fields", "Per-measure columns"
  for (const r of sectionRows) {
    const ref = cellRef(r, 0);
    if (ws[ref]) ws[ref].s = STYLE_SHEET_SUBTITLE;
  }
  for (let r = 0; r < lines.length; r++) {
    const ref = cellRef(r, 0);
    if (ws[ref] && !ws[ref].s) ws[ref].s = STYLE_SHEET_BODY;
  }
  return ws;
}

// ─── Template: empty Buildings sheet + Typology + Instructions ──────────────
export function downloadTemplate() {
  const X = XLSX;
  const cols = allColumns();

  const wsBuildings = {};
  writeHeaderBlock(wsBuildings, cols);
  recomputeRef(wsBuildings, 4, cols.length);

  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, wsBuildings,            'Buildings');
  X.utils.book_append_sheet(wb, buildTypologySheet(),   'Typology Defaults');
  X.utils.book_append_sheet(wb, buildInstructionsSheet(), 'Instructions');
  X.writeFile(wb, 'peeb-buildings-template.xlsx');
}

// ─── Export the live database ───────────────────────────────────────────────
export function exportBuildings(buildings) {
  const X = XLSX;
  const cols = allColumns();

  const ws = {};
  writeHeaderBlock(ws, cols);

  // Data rows start at row 5 (index 4).
  const DATA_START = 4;
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const rowIdx = DATA_START + i;
    const isZebra = (i % 2) === 1;

    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      let raw;
      if (col.measure) {
        const m = b.measures?.[col.measure];
        if (!m) raw = '';
        else if (col.field === 'selected')     raw = m.selected ? 'Yes' : 'No';
        else if (col.field === 'savingsRate')  raw = m.savingsRate ?? '';
        else if (col.field === 'capex')        raw = m.capex ?? '';
        else if (col.field === 'notes')        raw = m.notes ?? '';
      } else {
        raw = b[col.key];
      }
      raw = raw === undefined || raw === null ? '' : raw;

      const ref = cellRef(rowIdx, c);
      const isNumber = col.type === 'number' && raw !== '' && Number.isFinite(Number(raw));
      ws[ref] = isNumber
        ? { t: 'n', v: Number(raw) }
        : { t: 's', v: String(raw) };
      ws[ref].s = styleData(col, isZebra);
    }
  }

  recomputeRef(ws, DATA_START + Math.max(buildings.length, 1), cols.length);

  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, 'Buildings');
  const today = new Date().toISOString().slice(0, 10);
  X.writeFile(wb, `peeb-buildings-${today}.xlsx`);
}

// ─── Parse an uploaded file into partial buildings ───────────────────────────
export async function parseBuildingsFile(file) {
  const X = XLSX;
  const buf = await file.arrayBuffer();
  const wb = X.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => /building/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = X.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (aoa.length < 2) return [];

  // Row 1 is the technical keys. Rows 2–4 are header labels/badges/desc — skip them.
  // Data starts on row 5 (index 4) in the new template. For backwards compatibility
  // with older 2-row templates, we detect the first non-header row heuristically.
  const header = (aoa[0] || []).map(h => String(h).trim());
  const cols = allColumns();
  const keyToIdx = new Map(header.map((h, i) => [h, i]));

  // Find the first row that doesn't look like a header/description row.
  // Heuristic: a data row has at least one value AND does not equal "Required"/"Optional" in the first col.
  let startRow = 1;
  while (startRow < aoa.length) {
    const row = aoa[startRow];
    const first = row && row[0] !== undefined ? String(row[0]).trim() : '';
    const looksLikeHeader = !first
      || /^(Required|Optional|Required\*?|Optional\*?)$/i.test(first)
      || cols.some(c => c.label === first)
      || cols.some(c => (c.desc || '') === first);
    if (!looksLikeHeader) break;
    startRow++;
  }

  const parsed = [];
  for (let r = startRow; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

    const b = { measures: {} };
    for (const col of cols) {
      const idx = keyToIdx.get(col.key);
      if (idx === undefined) continue;
      const raw = row[idx];

      if (col.measure) {
        if (!b.measures[col.measure]) {
          b.measures[col.measure] = { selected: false, capex: null, savingsRate: null, notes: '' };
        }
        if (col.field === 'selected')         b.measures[col.measure].selected    = toBool(raw);
        else if (col.field === 'savingsRate') b.measures[col.measure].savingsRate = toNumber(raw);
        else if (col.field === 'capex')       b.measures[col.measure].capex       = toNumber(raw);
        else if (col.field === 'notes')       b.measures[col.measure].notes       = raw === '' ? '' : String(raw);
      } else if (col.type === 'number') {
        b[col.key] = toNumber(raw);
      } else if (col.type === 'boolean') {
        b[col.key] = toBool(raw);
      } else {
        b[col.key] = raw === '' ? '' : String(raw);
      }
    }
    if (!b.name) continue;            // skip rows without a name
    parsed.push(b);
  }
  return parsed;
}

// ─── Merge parsed rows with existing DB ─────────────────────────────────────
export function mergeParsedBuildings(existing, parsed, { strategy = 'replace', fillDefaults = true } = {}) {
  const existingByName = new Map(existing.map(b => [String(b.name).toLowerCase(), b]));
  const existingIds = new Set(existing.map(b => b.id));
  const added = [];
  const updated = [];

  for (const p of parsed) {
    const key = String(p.name).toLowerCase();
    const hit = existingByName.get(key);
    const full = materializeBuilding(p, hit, { fillDefaults, existingIds });

    if (hit) {
      if (strategy === 'skip') continue;
      updated.push(full);
    } else {
      added.push(full);
      existingIds.add(full.id);
    }
  }
  return { added, updated };
}

function materializeBuilding(parsed, existing, { fillDefaults, existingIds }) {
  const typology = parsed.typology || existing?.typology || '';
  const defaults = TYPOLOGY_DEFAULTS[typology] || {};

  const measures = {};
  for (const k of MEASURE_KEYS) {
    const def = defaults[k] || {};
    const pm  = parsed.measures?.[k] || {};
    const em  = existing?.measures?.[k] || {};
    measures[k] = {
      selected:    pm.selected ?? em.selected ?? false,
      capex:       pm.capex       ?? (fillDefaults ? (em.capex       ?? def.capex       ?? null) : (em.capex       ?? null)),
      savingsRate: pm.savingsRate ?? (fillDefaults ? (em.savingsRate ?? def.savingsRate ?? null) : (em.savingsRate ?? null)),
      notes:       pm.notes ?? em.notes ?? '',
    };
  }

  return {
    id:              existing?.id ?? buildIdFrom(parsed.name, existingIds),
    name:            parsed.name,
    typology,
    governorate:     parsed.governorate ?? existing?.governorate ?? '',
    region:          parsed.region      ?? existing?.region ?? '',
    address:         parsed.address     ?? existing?.address ?? '',
    area:            parsed.area            ?? existing?.area ?? null,
    yearBuilt:       parsed.yearBuilt       ?? existing?.yearBuilt ?? null,
    floors:          parsed.floors          ?? existing?.floors ?? null,
    baselineEUI:     parsed.baselineEUI     ?? existing?.baselineEUI ?? (fillDefaults ? (defaults.baselineEUI ?? null) : null),
    operatingHours:  parsed.operatingHours  ?? existing?.operatingHours ?? null,
    lat:             parsed.lat             ?? existing?.lat ?? null,
    lng:             parsed.lng             ?? existing?.lng ?? null,
    fundingSource:   parsed.fundingSource   ?? existing?.fundingSource ?? '',
    status:          parsed.status          ?? existing?.status ?? 'Planning',
    siteObservations:parsed.siteObservations?? existing?.siteObservations ?? '',
    priority:        existing?.priority ?? null,
    images:          existing?.images ?? [],
    measures,
  };
}
