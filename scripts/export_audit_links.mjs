import XLSX from 'xlsx-js-style';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Deduplicated data ────────────────────────────────────────────────────────
// URLs shared across multiple buildings → one generic row per group.
// Unique URLs → one row per building.

const rows = [
  // ── Hospitals (all share the same URL) ───────────────────────────────────
  {
    name: 'Hospitals',
    url: 'https://drive.google.com/open?id=1Uz_wPxW1bzFH6m3dYT94yXdMPH29JI23&usp=drive_fs',
  },

  // ── Schools — grouped by shared URL / governorates ───────────────────────
  {
    name: 'Schools — Ajloun / Tafileh  (22 buildings)',
    url: 'https://drive.google.com/open?id=1xhGlBTH7nfxHTJpe0KxzNLM4HD_9F-nX&usp=drive_fs',
  },
  {
    name: 'Schools — Karak / Ma\'an  (20 buildings)',
    url: 'https://drive.google.com/open?id=1CvKfHA9sEzTHv0oUBtxk4kiCAUXoyXFF&usp=drive_fs',
  },
  {
    name: 'Schools — Amman / Irbid  (16 buildings)',
    url: 'https://drive.google.com/open?id=1oBvVpwb2FkMwC3cf717J-yjQYhEu129p&usp=drive_fs',
  },

  // ── Administration (each has a unique URL) ────────────────────────────────
  {
    name: 'Al Zarqa Governorate Building',
    url: 'https://drive.google.com/open?id=1L06ch42yeH1BQbeFLZToPtdoNm_YrTOl&usp=drive_fs',
  },
  {
    name: 'Energy and Minerals Regulatory Commission',
    url: 'https://drive.google.com/open?id=1DVSwbkcuoOQkb4dxUSlsdl7Cl7e1IJHO&usp=drive_fs',
  },
  {
    name: 'Higher Council for the Affairs of Persons with Disabilities',
    url: 'https://drive.google.com/open?id=1f51w0bJxuD-26qG2S6CGfpWBMzLeWL0R&usp=drive_fs',
  },
  {
    name: 'Ministry of Energy and Mineral Resources',
    url: 'https://drive.google.com/open?id=1f-2L-V4UWS8VFMiAD9e_7Lq9Q5LNqEtF&usp=drive_fs',
  },
  {
    name: 'Ministry of Finance',
    url: 'https://drive.google.com/open?id=1tnesGqWHLYUmqL8TBSyR74VI7-CvjFNh&usp=drive_fs',
  },
  {
    name: 'Ministry of Foreign Affairs',
    url: 'https://drive.google.com/open?id=1qwTpATQ8-7TsFZB9qIO--gUVJXt4QR7F&usp=drive_fs',
  },
  {
    name: 'Ministry of Health',
    url: 'https://drive.google.com/open?id=1EuuNO1myoLETNZgzbUPX6rAGmbR-EhT_&usp=drive_fs',
  },
  {
    name: 'Ministry of Industry, Trade and Supply',
    url: 'https://drive.google.com/open?id=1Hc9A9SGnnXrC79yRED2OqDqSM9be7hE3&usp=drive_fs',
  },
  {
    name: 'Ministry of Labor',
    url: 'https://drive.google.com/open?id=1yj7jNO2s0_IZGyzq5SyUiBXoceh3gWLQ&usp=drive_fs',
  },
  {
    name: 'Ministry of Youth',
    url: 'https://drive.google.com/open?id=15eOLwrleOEAdGbHjNUr5AiNfap2U5U6F&usp=drive_fs',
  },
];

// ── Styles ───────────────────────────────────────────────────────────────────
const VIOLET   = 'FF30323E';
const WHITE    = 'FFFFFFFF';
const ZEBRA    = 'FFFAFAFA';
const BORDER_C = 'FFCCCCCC';

const BORDER = {
  top:    { style: 'thin', color: { rgb: BORDER_C } },
  bottom: { style: 'thin', color: { rgb: BORDER_C } },
  left:   { style: 'thin', color: { rgb: BORDER_C } },
  right:  { style: 'thin', color: { rgb: BORDER_C } },
};

function headerCell(v) {
  return {
    v,
    t: 's',
    s: {
      font:      { bold: true, color: { rgb: WHITE }, sz: 11, name: 'Open Sans' },
      fill:      { fgColor: { rgb: VIOLET } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border:    BORDER,
    },
  };
}

function dataCell(v, isLink, isZebra) {
  const bg = isZebra ? ZEBRA : WHITE;
  return {
    v: v ?? '',
    t: 's',
    l: isLink ? { Target: v } : undefined,
    s: {
      font:      isLink
        ? { color: { rgb: 'FF1155CC' }, underline: true, sz: 10, name: 'Open Sans' }
        : { color: { rgb: 'FF222222' }, sz: 10, name: 'Open Sans' },
      fill:      { fgColor: { rgb: bg } },
      alignment: { vertical: 'center', wrapText: false },
      border:    BORDER,
    },
  };
}

// ── Build worksheet ──────────────────────────────────────────────────────────
const ws = {};

// Header row (row 1)
ws['A1'] = headerCell('Building name');
ws['B1'] = headerCell('Audit link');

// Data rows
rows.forEach((row, i) => {
  const r  = i + 2;
  const zb = i % 2 === 1;
  ws[`A${r}`] = dataCell(row.name, false, zb);
  ws[`B${r}`] = dataCell(row.url,  true,  zb);
});

// Sheet range
ws['!ref'] = `A1:B${rows.length + 1}`;

// Column widths
ws['!cols'] = [
  { wch: 55 },   // Building name
  { wch: 75 },   // URL
];

// Row heights
ws['!rows'] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 20 }))];

// ── Workbook ─────────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Audit links');

const outPath = path.join(__dirname, '..', 'audit_links.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Written:', outPath);
