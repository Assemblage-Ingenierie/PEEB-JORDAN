/**
 * Excel I/O — download template, export DB, parse uploaded files.
 * Uses xlsx-js-style (npm) for cell styles (fills, fonts, borders).
 */

import XLSX from 'xlsx-js-style';
import {
  MEASURE_KEYS, MEASURE_KEYS_EE, MEASURE_KEYS_RE, MEASURE_META, TYPOLOGY_DEFAULTS,
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
// The export is structured in three vertical sections mirroring the building
// profile layout: General Information / Refurbishment Program / Investment.

const GENERAL_COLUMNS = [
  { key: 'name',             label: 'Building name',              type: 'text',   desc: 'Unique name for the building' },
  { key: 'typology',         label: 'Building typology',          type: 'text',   desc: 'School / Hospital / Administration / University' },
  { key: 'governorate',      label: 'Governorate',                type: 'text',   desc: 'Jordanian governorate (Amman, Zarqa, Irbid, …)' },
  { key: 'region',           label: 'Region',                     type: 'text',   desc: 'North / Central / South — inferred from governorate if empty' },
  { key: 'address',          label: 'Address',                    type: 'text',   desc: 'Full street address' },
  { key: 'area',             label: 'Floor area (m²)',            type: 'number', desc: 'Total floor area in m²' },
  { key: 'yearBuilt',        label: 'Year built',                 type: 'number', desc: 'Year of construction' },
  { key: 'floors',           label: 'Number of floors',           type: 'number', desc: 'Number of above-ground floors' },
  { key: 'baselineEUI',      label: 'Baseline EUI (kWh/m²/yr)',   type: 'number', desc: 'Energy Use Intensity (kWh/m²/yr)' },
  { key: 'operatingHours',   label: 'Operating hours',            type: 'text',   desc: 'Typical weekly operating schedule' },
  { key: 'lat',              label: 'Latitude',                   type: 'number', desc: 'GPS latitude (decimal degrees)' },
  { key: 'lng',              label: 'Longitude',                  type: 'number', desc: 'GPS longitude (decimal degrees)' },
  { key: 'existingAudit',    label: 'Existing audit',             type: 'boolean', desc: 'Yes / No — energy audit performed?' },
  { key: 'auditAuthor',      label: 'Audit author',               type: 'text',   desc: 'Name or organisation that conducted the audit' },
  { key: 'auditDate',        label: 'Audit date',                 type: 'text',   desc: 'YYYY-MM-DD' },
  { key: 'auditFileUrl',     label: 'Audit file URL',             type: 'text',   desc: 'URL to the audit PDF (Google Drive link, etc.)' },
  { key: 'fundingSource',    label: 'Existing funding source',    type: 'text',   desc: 'Any non-empty value excludes the building from PEEB grant' },
  { key: 'siteObservations', label: 'Site observations',          type: 'text',   desc: 'Free notes from site visit' },
];

const REFURBISHMENT_COLUMNS_HEAD = [
  { key: 'totalBaselineKwh', label: 'Total baseline (kWh/yr)',    type: 'number', desc: 'Total baseline energy consumption (kWh/yr)' },
  { key: 'totalProjectKwh',  label: 'Total project (kWh/yr)',     type: 'number', desc: 'Total post-works energy consumption (kWh/yr)' },
  { key: 'gainOverride',     label: 'Energy gain override (%)',   type: 'number', readOnly: true, desc: 'DO NOT FILL — derived automatically from Baseline − Project' },
  { key: 'designProgress',   label: 'Design progress',            type: 'text',   desc: 'ongoing / completed (empty = not started)' },
  { key: 'worksProgress',    label: 'Works progress',             type: 'text',   desc: 'ongoing / completed (empty = not started)' },
];

const INVESTMENT_COLUMNS = [
  { key: 'priority',           label: 'Political priority',        type: 'text',    desc: 'High / Medium / Low' },
  { key: 'peebSelected',       label: 'PEEB selected',             type: 'boolean', desc: 'Yes / No — included in the PEEB programme' },
  { key: 'manuallyIneligible', label: 'Manually ineligible',       type: 'boolean', desc: 'Yes / No — manually excluded from PEEB grant' },
  { key: 'afdLoan',            label: 'AFD loan (JOD)',            type: 'number',  desc: 'AFD loan portion of remaining-to-finance' },
  { key: 'nationalBudget',     label: 'National budget (JOD)',     type: 'number',  desc: 'National budget portion of remaining-to-finance' },
  { key: 'others',             label: 'Others (JOD)',              type: 'number',  desc: 'Other funding sources' },
];

function savingsDescFor(key) {
  if (MEASURE_KEYS_RE.includes(key)) {
    return 'Renewable production as a share of the project (post-EE) consumption — value between 0 and 1';
  }
  return 'Share of the total energy savings attributable to this measure — value between 0 and 1';
}

// Per-measure columns — EE measures get capex + savings, all get selected + notes.
export function measureColumns() {
  const cols = [];
  for (const key of MEASURE_KEYS) {
    const meta = MEASURE_META[key];
    const isEE = MEASURE_KEYS_EE.includes(key);
    cols.push({
      key: `${key}_selected`, measure: key, field: 'selected',
      label: `${meta.short} — selected`, type: 'boolean',
      desc: 'Yes / No — measure included in the refurbishment plan',
    });
    cols.push({
      key: `${key}_capex`, measure: key, field: 'capex',
      label: `${meta.short} — CAPEX (JOD/m²)`, type: 'number', readOnly: true,
      desc: 'DO NOT FILL — derived from CAPEX total ÷ floor area',
    });
    cols.push({
      key: `${key}_capex_total`, measure: key, field: 'capexAbsolute',
      label: `${meta.short} — CAPEX total (JOD)`, type: 'number',
      desc: 'Absolute CAPEX in JOD — the value to fill on import',
    });
    if (isEE) {
      cols.push({
        key: `${key}_savings`, measure: key, field: 'savingsRate',
        label: `${meta.short} — share %`, type: 'number',
        desc: savingsDescFor(key),
      });
    }
    cols.push({
      key: `${key}_notes`, measure: key, field: 'notes',
      label: `${meta.short} — notes`, type: 'text',
      desc: 'Free text — scope, constraints, brands',
    });
  }
  return cols;
}

// Three-section grouping for header banners
export function sectionedColumns() {
  return [
    { key: 'general',       label: 'General Information',    cols: GENERAL_COLUMNS },
    { key: 'refurbishment', label: 'Refurbishment Program',  cols: [...REFURBISHMENT_COLUMNS_HEAD, ...measureColumns()] },
    { key: 'investment',    label: 'Investment',             cols: INVESTMENT_COLUMNS },
  ];
}

export function allColumns() {
  return sectionedColumns().flatMap(s => s.cols);
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
// Section banner — bold white on accent red.
const STYLE_SECTION_BANNER = {
  font: { name: 'Arial', sz: 11, bold: true, color: { rgb: COLOR.white } },
  fill: { fgColor: { rgb: COLOR.accentRed }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER,
};

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

// Row 2 variant for read-only / derived columns — muted grey instead of violet.
const STYLE_MAIN_LABEL_RO = {
  font: { name: 'Arial', sz: 10, bold: true, italic: true, color: { rgb: COLOR.greyDark } },
  fill: { fgColor: { rgb: COLOR.greyLight }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER,
};

// Row 4 variant for read-only — italic muted with red accent for the "DO NOT FILL" warning.
const STYLE_DESCRIPTION_RO = {
  font: { name: 'Arial', sz: 8, italic: true, bold: true, color: { rgb: COLOR.accentRed } },
  fill: { fgColor: { rgb: COLOR.greyLight }, patternType: 'solid' },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
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

// Data rows — plain with light zebra tint on odd rows; read-only columns get a grey fill + italic.
function styleData(col, isZebra) {
  const s = {
    font: {
      name: 'Arial', sz: 10,
      color: { rgb: col.readOnly ? COLOR.greyDark : COLOR.black },
      italic: !!col.readOnly,
    },
    alignment: { horizontal: col.type === 'number' ? 'right' : 'left', vertical: 'center' },
    border: BORDER,
  };
  if (col.readOnly) {
    s.fill = { fgColor: { rgb: COLOR.greyLight }, patternType: 'solid' };
  } else if (isZebra) {
    s.fill = { fgColor: { rgb: COLOR.zebra }, patternType: 'solid' };
  }
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

// ─── Apply the 4-row header + section banners + freeze pane ─────────────────
// Rows:
//   0 — section banners (merged across each section's columns)
//   1 — dev keys (tiny)
//   2 — column labels (bold white on violet)
//   3 — descriptions
function writeHeaderBlock(ws, sections) {
  const flat = sections.flatMap(s => s.cols);

  // Row 0: section banners with merged cells
  const merges = [];
  let cursor = 0;
  for (const section of sections) {
    if (!section.cols.length) continue;
    const startCol = cursor;
    const endCol = cursor + section.cols.length - 1;
    const bannerRef = cellRef(0, startCol);
    ws[bannerRef] = { t: 's', v: section.label, s: STYLE_SECTION_BANNER };
    // Fill the rest of the merged span with empty styled cells so borders render
    for (let c = startCol + 1; c <= endCol; c++) {
      ws[cellRef(0, c)] = { t: 's', v: '', s: STYLE_SECTION_BANNER };
    }
    merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: endCol } });
    cursor = endCol + 1;
  }
  ws['!merges'] = merges;

  // Rows 1–3: per-column header content
  for (let c = 0; c < flat.length; c++) {
    const col = flat[c];
    ws[cellRef(1, c)] = { t: 's', v: col.key,        s: STYLE_DEV_KEYS };
    ws[cellRef(2, c)] = { t: 's', v: col.label,      s: col.readOnly ? STYLE_MAIN_LABEL_RO : STYLE_MAIN_LABEL };
    ws[cellRef(3, c)] = { t: 's', v: col.desc || '', s: col.readOnly ? STYLE_DESCRIPTION_RO : STYLE_DESCRIPTION };
  }

  ws['!rows'] = [
    { hpt: 22 },   // row 0 (section banner)
    { hpt: 12 },   // row 1 (dev keys)
    { hpt: 30 },   // row 2 (label)
    { hpt: 36 },   // row 3 (description)
  ];

  ws['!cols'] = flat.map(c => ({
    wch: Math.max(14, Math.min(34, Math.max(c.label.length, (c.desc || '').length / 3) + 2)),
  }));

  // Freeze below row 4 (after the 4 header rows) so data scrolls under a fixed header.
  ws['!freeze'] = { xSplit: 1, ySplit: 4 };
  ws['!views'] = [{ state: 'frozen', xSplit: 1, ySplit: 4 }];
}

// Ensure the sheet's declared !ref spans all cells we populated.
function recomputeRef(ws, nRows, nCols) {
  const X = XLSX;
  ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: nRows - 1, c: nCols - 1 } });
}

// ─── Instructions sheet ─────────────────────────────────────────────────────
function buildInstructionsSheet() {
  const X = XLSX;
  const lines = [
    ['PEEB Med Jordan — Buildings export'],
    [''],
    ['Sheet layout'],
    ['The Buildings sheet has 4 header rows:'],
    ['• Row 1 — section banner (General Information / Refurbishment Program / Investment)'],
    ['• Row 2 — technical column keys (do not edit; they drive the import)'],
    ['• Row 3 — human-readable labels'],
    ['• Row 4 — short description'],
    ['Building rows start at row 5.'],
    [''],
    ['Per-measure columns'],
    ['• <measure>_selected — Yes / No / 1 / 0 / true / false'],
    ['• <measure>_capex — unit cost in JOD/m²'],
    ['• <measure>_capex_total — absolute CAPEX in JOD'],
    ['• <measure>_savings — value 0 to 1'],
    ['     For EE core measures (insulation, windows, hvac, lighting): share of the total energy savings.'],
    ['     For renewable measures (PV, solar thermal): production as a share of the project consumption.'],
    ['• <measure>_notes — free text'],
    [''],
    ['Notes'],
    ['• Empty cells are left blank — no automatic defaults are applied.'],
    ['• existingAudit "Yes" enables auditAuthor, auditDate and auditFileUrl.'],
    ['• fundingSource set to a non-empty value automatically excludes the building from PEEB grant.'],
  ];
  const ws = X.utils.aoa_to_sheet(lines);
  ws['!cols'] = [{ wch: 110 }];

  ws['A1'].s = STYLE_SHEET_TITLE;
  const sectionRows = [2, 10, 19];
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

// ─── Template: empty Buildings sheet + Instructions ─────────────────────────
export function downloadTemplate() {
  const X = XLSX;
  const sections = sectionedColumns();
  const flat = sections.flatMap(s => s.cols);

  const wsBuildings = {};
  writeHeaderBlock(wsBuildings, sections);
  recomputeRef(wsBuildings, 4, flat.length);

  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, wsBuildings,              'Buildings');
  X.utils.book_append_sheet(wb, buildInstructionsSheet(), 'Instructions');
  X.writeFile(wb, 'peeb-buildings-template.xlsx');
}

// ─── Export the live database ───────────────────────────────────────────────
export function exportBuildings(buildings) {
  const X = XLSX;
  const sections = sectionedColumns();
  const flat = sections.flatMap(s => s.cols);

  const ws = {};
  writeHeaderBlock(ws, sections);

  // Data rows start at row 5 (index 4) — header is 4 rows.
  const DATA_START = 4;
  const formatBool = (v) => v === true ? 'Yes' : v === false ? 'No' : '';
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const rowIdx = DATA_START + i;
    const isZebra = (i % 2) === 1;

    for (let c = 0; c < flat.length; c++) {
      const col = flat[c];
      let raw;
      if (col.measure) {
        const m = b.measures?.[col.measure];
        if (!m) raw = '';
        else if (col.field === 'selected')      raw = formatBool(!!m.selected);
        else if (col.field === 'savingsRate')   raw = m.savingsRate ?? '';
        else if (col.field === 'capex')         raw = m.capex ?? '';
        else if (col.field === 'capexAbsolute') raw = m.capexAbsolute ?? '';
        else if (col.field === 'notes')         raw = m.notes ?? '';
      } else if (col.type === 'boolean') {
        raw = formatBool(b[col.key]);
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

  recomputeRef(ws, DATA_START + Math.max(buildings.length, 1), flat.length);

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

  // The export template has 4 header rows: section banner / keys / labels / description.
  // Older templates put keys in row 0. Locate the technical-keys row by picking the row
  // with the most matches against known column keys.
  const cols = allColumns();
  const knownKeys = new Set(cols.map(c => c.key));
  let keyRowIdx = 0;
  let bestMatches = 0;
  for (let r = 0; r < Math.min(aoa.length, 4); r++) {
    const matches = (aoa[r] || []).reduce(
      (acc, v) => acc + (typeof v === 'string' && knownKeys.has(v.trim()) ? 1 : 0),
      0
    );
    if (matches > bestMatches) { bestMatches = matches; keyRowIdx = r; }
  }
  const header = (aoa[keyRowIdx] || []).map(h => String(h).trim());
  const keyToIdx = new Map(header.map((h, i) => [h, i]));

  // Find the first row that doesn't look like a header/description row.
  let startRow = keyRowIdx + 1;
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
      // Read-only columns are derived in the engine — ignore whatever the user pasted.
      if (col.readOnly) continue;
      const idx = keyToIdx.get(col.key);
      if (idx === undefined) continue;
      const raw = row[idx];

      if (col.measure) {
        if (!b.measures[col.measure]) {
          b.measures[col.measure] = { selected: false, capex: null, savingsRate: null, notes: '' };
        }
        if (col.field === 'selected')               b.measures[col.measure].selected      = toBool(raw);
        else if (col.field === 'savingsRate')       b.measures[col.measure].savingsRate   = toNumber(raw);
        else if (col.field === 'capex')             b.measures[col.measure].capex         = toNumber(raw);
        else if (col.field === 'capexAbsolute')     b.measures[col.measure].capexAbsolute = toNumber(raw);
        else if (col.field === 'notes')             b.measures[col.measure].notes         = raw === '' ? '' : String(raw);
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
      selected:      pm.selected ?? em.selected ?? false,
      capex:         pm.capex         ?? (fillDefaults ? (em.capex ?? def.capex ?? null) : (em.capex ?? null)),
      capexAbsolute: pm.capexAbsolute ?? em.capexAbsolute ?? 0,
      savingsRate:   pm.savingsRate   ?? em.savingsRate ?? null,
      notes:         pm.notes ?? em.notes ?? '',
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
    existingAudit:   parsed.existingAudit   ?? existing?.existingAudit ?? false,
    auditAuthor:     parsed.auditAuthor     ?? existing?.auditAuthor ?? '',
    auditDate:       parsed.auditDate       ?? existing?.auditDate ?? '',
    auditFileUrl:    parsed.auditFileUrl    ?? existing?.auditFileUrl ?? '',
    fundingSource:   parsed.fundingSource   ?? existing?.fundingSource ?? '',
    status:          parsed.status          ?? existing?.status ?? 'Planning',
    siteObservations:parsed.siteObservations?? existing?.siteObservations ?? '',
    priority:        existing?.priority ?? null,
    images:          existing?.images ?? [],
    totalBaselineKwh: parsed.totalBaselineKwh ?? existing?.totalBaselineKwh ?? null,
    totalProjectKwh:  parsed.totalProjectKwh  ?? existing?.totalProjectKwh  ?? null,
    gainOverride:     parsed.gainOverride     ?? existing?.gainOverride     ?? null,
    designProgress:   parsed.designProgress   ?? existing?.designProgress   ?? null,
    worksProgress:    parsed.worksProgress    ?? existing?.worksProgress    ?? null,
    measures,
  };
}
