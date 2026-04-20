/**
 * PEEB Med Jordan — Calculation Engine  (v2)
 * Pure, side-effect-free functions for all energy-efficiency maths.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const CO2_FACTOR = 0.7 / 1000; // tCO₂ / kWh (Jordan grid)

export const FUNDING_TIERS = [
  { minGain:  0, maxGain: 30, grantRate: 0.00, label: 'Below Threshold',    color: 'slate'  },
  { minGain: 30, maxGain: 35, grantRate: 0.50, label: 'Tier 1 — 50% Grant', color: 'amber'  },
  { minGain: 35, maxGain: 40, grantRate: 0.60, label: 'Tier 2 — 60% Grant', color: 'blue'   },
  { minGain: 40, maxGain: 45, grantRate: 0.70, label: 'Tier 3 — 70% Grant', color: 'green'  },
  { minGain: 45, maxGain: Infinity, grantRate: 0.80, label: 'Tier 4 — 80% Grant', color: 'purple' },
];

/** EE measures — contribute to energy gain & PEEB grant */
export const MEASURE_KEYS_EE = ['insulation', 'windows', 'hvac', 'lighting', 'pv', 'solarThermal'];

/** Global Refurbishment measures — 0% energy savings, non-EE capex, eligible for AFD */
export const MEASURE_KEYS_GR = ['structure', 'accessibility', 'hygieneAndSecurity'];

export const MEASURE_KEYS = [...MEASURE_KEYS_EE, ...MEASURE_KEYS_GR];

export const MEASURE_META = {
  // ── Energy Efficiency ──────────────────────────────────────────────────────
  insulation:         { label: 'Roof / Wall Insulation',  short: 'Insulation',    unit: 'JOD/m²', icon: 'Layers',      isEE: true,  lockSavings: false },
  windows:            { label: 'Window Replacement',      short: 'Windows',       unit: 'JOD/m²', icon: 'Square',      isEE: true,  lockSavings: false },
  hvac:               { label: 'HVAC Upgrade',            short: 'HVAC',          unit: 'JOD/m²', icon: 'Wind',        isEE: true,  lockSavings: false },
  lighting:           { label: 'LED Lighting',            short: 'Lighting',      unit: 'JOD/m²', icon: 'Lightbulb',   isEE: true,  lockSavings: false },
  pv:                 { label: 'PV Solar System',         short: 'PV',            unit: 'JOD/m²', icon: 'Sun',         isEE: true,  lockSavings: false },
  solarThermal:       { label: 'Solar Thermal (hot water)', short: 'Solar Thermal', unit: 'JOD/m²', icon: 'Droplets',   isEE: true,  lockSavings: false },
  // ── Global Refurbishment (0 % energy savings, locked) ─────────────────────
  structure:          { label: 'Structure',               short: 'Structure',     unit: 'JOD/m²', icon: 'Building2',   isEE: false, lockSavings: true  },
  accessibility:      { label: 'Accessibility',           short: 'Accessibility', unit: 'JOD/m²', icon: 'Accessibility', isEE: false, lockSavings: true },
  hygieneAndSecurity: { label: 'Hygiene & Security',      short: 'Hygiene',       unit: 'JOD/m²', icon: 'ShieldCheck', isEE: false, lockSavings: true  },
};

/** Typology-based defaults (JOD/m² capex, savings rates) */
export const TYPOLOGY_DEFAULTS = {
  School: {
    baselineEUI: 82,
    insulation:         { capex: 25,  savingsRate: 0.15 },
    windows:            { capex: 80,  savingsRate: 0.12 },
    hvac:               { capex: 120, savingsRate: 0.25 },
    lighting:           { capex: 20,  savingsRate: 0.30 },
    pv:                 { capex: 150, savingsRate: 0.20 },
    solarThermal:       { capex: 110, savingsRate: 0.05 },
    structure:          { capex: 130, savingsRate: 0 },
    accessibility:      { capex: 70,  savingsRate: 0 },
    hygieneAndSecurity: { capex: 60,  savingsRate: 0 },
  },
  Hospital: {
    baselineEUI: 260,
    insulation:         { capex: 30,  savingsRate: 0.10 },
    windows:            { capex: 90,  savingsRate: 0.10 },
    hvac:               { capex: 200, savingsRate: 0.30 },
    lighting:           { capex: 25,  savingsRate: 0.25 },
    pv:                 { capex: 160, savingsRate: 0.15 },
    solarThermal:       { capex: 140, savingsRate: 0.18 },
    structure:          { capex: 180, savingsRate: 0 },
    accessibility:      { capex: 100, savingsRate: 0 },
    hygieneAndSecurity: { capex: 120, savingsRate: 0 },
  },
  Office: {
    baselineEUI: 130,
    insulation:         { capex: 28,  savingsRate: 0.14 },
    windows:            { capex: 85,  savingsRate: 0.13 },
    hvac:               { capex: 140, savingsRate: 0.28 },
    lighting:           { capex: 22,  savingsRate: 0.32 },
    pv:                 { capex: 150, savingsRate: 0.22 },
    solarThermal:       { capex: 120, savingsRate: 0.04 },
    structure:          { capex: 140, savingsRate: 0 },
    accessibility:      { capex: 75,  savingsRate: 0 },
    hygieneAndSecurity: { capex: 65,  savingsRate: 0 },
  },
  Municipality: {
    baselineEUI: 105,
    insulation:         { capex: 26,  savingsRate: 0.13 },
    windows:            { capex: 82,  savingsRate: 0.12 },
    hvac:               { capex: 130, savingsRate: 0.26 },
    lighting:           { capex: 21,  savingsRate: 0.31 },
    pv:                 { capex: 145, savingsRate: 0.21 },
    solarThermal:       { capex: 115, savingsRate: 0.05 },
    structure:          { capex: 130, savingsRate: 0 },
    accessibility:      { capex: 70,  savingsRate: 0 },
    hygieneAndSecurity: { capex: 60,  savingsRate: 0 },
  },
  University: {
    baselineEUI: 150,
    insulation:         { capex: 28,  savingsRate: 0.14 },
    windows:            { capex: 88,  savingsRate: 0.13 },
    hvac:               { capex: 155, savingsRate: 0.27 },
    lighting:           { capex: 23,  savingsRate: 0.33 },
    pv:                 { capex: 155, savingsRate: 0.23 },
    solarThermal:       { capex: 125, savingsRate: 0.08 },
    structure:          { capex: 155, savingsRate: 0 },
    accessibility:      { capex: 85,  savingsRate: 0 },
    hygieneAndSecurity: { capex: 70,  savingsRate: 0 },
  },
};

/** Build a savings-rate matrix { [typology]: { [measure]: rate } } from TYPOLOGY_DEFAULTS */
export function buildDefaultSavingsByTypology() {
  const out = {};
  for (const [typ, def] of Object.entries(TYPOLOGY_DEFAULTS)) {
    out[typ] = {};
    for (const k of MEASURE_KEYS_EE) {
      out[typ][k] = def[k]?.savingsRate ?? 0;
    }
  }
  return out;
}

export const DONOR_MARKERS = ['GIZ', 'KfW', 'USAID', 'EU', 'World Bank', 'EBRD', 'AFD'];

// ─── Core Calculation Functions ───────────────────────────────────────────────

/**
 * Thermal Synergy: insulation OR windows selected → HVAC capex −20%, savings +15%
 */
export function applyThermalSynergy(measures) {
  const hasThermal = measures.insulation?.selected || measures.windows?.selected;
  if (!hasThermal || !measures.hvac) return { measures, synergyApplied: false };
  return {
    synergyApplied: true,
    measures: {
      ...measures,
      hvac: {
        ...measures.hvac,
        capex:       +(measures.hvac.capex * 0.80).toFixed(2),
        savingsRate: +Math.min(measures.hvac.savingsRate * 1.15, 0.95).toFixed(4),
      },
    },
  };
}

/**
 * Energy gain % — EE measures only (compound diminishing-returns model).
 */
export function calculateEnergyGain(measures) {
  const { measures: syn } = applyThermalSynergy(measures);
  let residual = 1.0;
  MEASURE_KEYS_EE.forEach(key => {
    const m = syn[key];
    if (m?.selected && m.savingsRate > 0) residual *= (1 - m.savingsRate);
  });
  return +((1 - residual) * 100).toFixed(2);
}

export function getFundingTier(gainPercent) {
  return FUNDING_TIERS.find(t => gainPercent >= t.minGain && gainPercent < t.maxGain) || FUNDING_TIERS[0];
}

/**
 * CAPEX split: { ee, gr, perM2, total } — all in JOD.
 * PEEB grant is applied to EE capex only.
 */
export function calculateCapex(measures, area) {
  const { measures: syn } = applyThermalSynergy(measures);

  const eePerM2 = MEASURE_KEYS_EE.reduce((s, k) => {
    const m = syn[k]; return m?.selected ? s + (m.capex || 0) : s;
  }, 0);
  const grPerM2 = MEASURE_KEYS_GR.reduce((s, k) => {
    const m = measures[k]; return m?.selected ? s + (m.capex || 0) : s;
  }, 0);
  const totalPerM2 = eePerM2 + grPerM2;

  return {
    ee:    { perM2: +eePerM2.toFixed(2),    total: +(eePerM2    * area).toFixed(2) },
    gr:    { perM2: +grPerM2.toFixed(2),    total: +(grPerM2    * area).toFixed(2) },
    perM2: +totalPerM2.toFixed(2),
    total: +(totalPerM2 * area).toFixed(2),
  };
}

/**
 * Full building calculation.
 * params.others — additional funding source (JOD)
 */
export function calculateBuilding({ building, measures, params }) {
  const { area, baselineEUI, typology } = building;
  const { currency, exchangeRate, energyCost, afdLoan = 0, nationalBudget = 0, others = 0, savingsByTypology } = params;

  // Apply typology-specific savings rates (override per-measure rate if a typology matrix is configured)
  const typRates = savingsByTypology?.[typology];
  const measuresWithTyp = typRates
    ? Object.fromEntries(
        Object.entries(measures).map(([k, m]) =>
          typRates[k] != null && !MEASURE_META[k]?.lockSavings
            ? [k, { ...m, savingsRate: typRates[k] }]
            : [k, m]
        )
      )
    : measures;

  const { measures: synMeasures, synergyApplied } = applyThermalSynergy(measuresWithTyp);
  const energyGain = calculateEnergyGain(measuresWithTyp);
  const tier       = getFundingTier(energyGain);
  const capexJOD   = calculateCapex(measuresWithTyp, area);

  // Energy & CO₂
  const energySavedKWh  = baselineEUI * area * (energyGain / 100);
  const co2AvoidedTon   = +(energySavedKWh * CO2_FACTOR).toFixed(2);

  // Finance (JOD)
  const annualSavingsJOD = +(energySavedKWh * energyCost).toFixed(2);
  const peebGrantJOD     = +(capexJOD.ee.total * tier.grantRate).toFixed(2); // grant on EE only
  const totalFundingJOD  = +(peebGrantJOD + afdLoan + nationalBudget + others).toFixed(2);
  const netCapexJOD      = +(capexJOD.total - totalFundingJOD).toFixed(2);
  const paybackYears     = annualSavingsJOD > 0
    ? +(netCapexJOD / annualSavingsJOD).toFixed(1) : null;

  const toDisplay = (jod) =>
    currency === 'EUR' ? +(jod * exchangeRate).toFixed(2) : jod;

  return {
    energyGain,
    tier,
    synergyApplied,
    synMeasures,
    baselineConsumption: +(baselineEUI * area).toFixed(0),
    energySavedKWh:      +energySavedKWh.toFixed(0),
    co2AvoidedTon,
    capex: {
      ee:    { perM2: toDisplay(capexJOD.ee.perM2), total: toDisplay(capexJOD.ee.total) },
      gr:    { perM2: toDisplay(capexJOD.gr.perM2), total: toDisplay(capexJOD.gr.total) },
      perM2: toDisplay(capexJOD.perM2),
      total: toDisplay(capexJOD.total),
    },
    annualSavings:  toDisplay(annualSavingsJOD),
    peebGrant:      toDisplay(peebGrantJOD),
    afdLoan:        toDisplay(afdLoan),
    nationalBudget: toDisplay(nationalBudget),
    others:         toDisplay(others),
    totalFunding:   toDisplay(totalFundingJOD),
    netCapex:       toDisplay(netCapexJOD),
    paybackYears,
    currency,
    _jod: { capex: capexJOD.total, eeCapex: capexJOD.ee.total, grCapex: capexJOD.gr.total, peebGrant: peebGrantJOD, annualSavings: annualSavingsJOD },
  };
}

// ─── Database Utilities ───────────────────────────────────────────────────────

export const REQUIRED_FIELDS = ['name','typology','governorate','area','baselineEUI','yearBuilt','floors','coordinates'];

export function detectDataGaps(building) {
  return REQUIRED_FIELDS.filter(f => {
    const v = building[f];
    return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
  });
}

export function checkEligibility(building) {
  if (building.manuallyIneligible === true)
    return { ineligible: true, donor: null, reason: 'manual' };
  if (!building.fundingSource)
    return { ineligible: false, donor: null, reason: null };
  const found = DONOR_MARKERS.find(d => building.fundingSource.toUpperCase().includes(d.toUpperCase()));
  return { ineligible: !!found, donor: found || null, reason: found ? 'donor' : null };
}

// ─── Scoring indicator catalogue ─────────────────────────────────────────────
// Each entry describes how to extract and interpret a measurable indicator.
// direction 'higher' → more = better (score rises with value up to cap)
// direction 'lower'  → less = better (score rises as value falls toward 0)

export const SCORE_INDICATORS = {
  energyGain: {
    label: 'Energy Savings Potential',
    unit: '%',
    direction: 'higher',
    defaultCap: 45,
    capLabel: 'Full score at … % gain',
    getValue: (_b, calc) => calc?.energyGain ?? 0,
    formatDetail: (v) => `${v.toFixed(1)}% gain`,
  },
  area: {
    label: 'Building Floor Area',
    unit: 'm²',
    direction: 'higher',
    defaultCap: 5000,
    capLabel: 'Full score at … m²',
    getValue: (b) => b.area ?? 0,
    formatDetail: (v) => v > 0 ? `${Math.round(v).toLocaleString()} m²` : 'No area data',
  },
  dataCompleteness: {
    label: 'Data Completeness',
    unit: '%',
    direction: 'higher',
    defaultCap: 100,
    capLabel: 'Full score at … % fields filled',
    getValue: (b) => {
      const gaps = detectDataGaps(b);
      return (REQUIRED_FIELDS.length - gaps.length) / REQUIRED_FIELDS.length * 100;
    },
    formatDetail: (v, b) => {
      const gaps = detectDataGaps(b);
      const filled = REQUIRED_FIELDS.length - gaps.length;
      return `${filled} / ${REQUIRED_FIELDS.length} fields (${v.toFixed(0)}%)`;
    },
  },
  costEffectiveness: {
    label: 'Cost Effectiveness',
    unit: '%/yr',
    direction: 'higher',
    defaultCap: 8,
    capLabel: 'Full score at … % annual return',
    getValue: (_b, calc) => {
      const s = calc?._jod?.annualSavings ?? 0;
      const c = calc?._jod?.capex ?? 0;
      return c > 0 ? (s / c) * 100 : 0;
    },
    formatDetail: (v, _b, calc) => {
      const c = calc?._jod?.capex ?? 0;
      return c > 0 ? `${v.toFixed(1)}%/yr annual return` : 'No capex yet';
    },
  },
  peebTier: {
    label: 'PEEB Grant Tier',
    unit: 'tier (0–4)',
    direction: 'higher',
    defaultCap: 4,
    capLabel: 'Full score at Tier … (max = 4)',
    getValue: (_b, calc) => {
      const rates = [0, 0.5, 0.6, 0.7, 0.8];
      return Math.max(0, rates.indexOf(calc?.tier?.grantRate ?? 0));
    },
    formatDetail: (_v, _b, calc) => calc?.tier?.label ?? 'Below Threshold',
  },
  baselineEUI: {
    label: 'Energy Intensity (Baseline EUI)',
    unit: 'kWh/m²/yr',
    direction: 'higher',
    defaultCap: 250,
    capLabel: 'Full score at … kWh/m²/yr',
    getValue: (b) => b.baselineEUI ?? 0,
    formatDetail: (v) => v > 0 ? `${v} kWh/m²/yr` : 'No EUI data',
  },
  buildingAge: {
    label: 'Building Age',
    unit: 'years',
    direction: 'higher',
    defaultCap: 50,
    capLabel: 'Full score at … years old',
    getValue: (b) => b.yearBuilt ? (2025 - b.yearBuilt) : 0,
    formatDetail: (v, b) => b.yearBuilt ? `${v} yrs (built ${b.yearBuilt})` : 'No year data',
  },
  co2Avoided: {
    label: 'CO₂ Reduction Potential',
    unit: 'tCO₂/yr',
    direction: 'higher',
    defaultCap: 100,
    capLabel: 'Full score at … tCO₂/yr',
    getValue: (_b, calc) => calc?.co2AvoidedTon ?? 0,
    formatDetail: (v) => `${v.toFixed(1)} tCO₂/yr`,
  },
  annualSavings: {
    label: 'Annual Energy Savings',
    unit: 'JOD/yr',
    direction: 'higher',
    defaultCap: 50000,
    capLabel: 'Full score at … JOD/yr',
    getValue: (_b, calc) => calc?._jod?.annualSavings ?? 0,
    formatDetail: (v) => `JOD ${Math.round(v).toLocaleString()}/yr`,
  },
  peebGrant: {
    label: 'PEEB Grant Amount',
    unit: 'JOD',
    direction: 'higher',
    defaultCap: 500000,
    capLabel: 'Full score at … JOD grant',
    getValue: (_b, calc) => calc?._jod?.peebGrant ?? 0,
    formatDetail: (v) => `JOD ${Math.round(v).toLocaleString()} grant`,
  },
  payback: {
    label: 'Payback Period',
    unit: 'years',
    direction: 'lower',
    defaultCap: 25,
    capLabel: '0 pts at … years payback',
    getValue: (_b, calc) => calc?.paybackYears ?? Infinity,
    formatDetail: (v, _b, calc) => calc?.paybackYears ? `${calc.paybackYears} yr payback` : 'N/A (no capex)',
  },
  netCapex: {
    label: 'Net CAPEX after grants',
    unit: 'JOD',
    direction: 'lower',
    defaultCap: 1000000,
    capLabel: '0 pts at … JOD net cost',
    getValue: (_b, calc) => {
      const c = calc?._jod?.capex ?? 0;
      const g = calc?._jod?.peebGrant ?? 0;
      return Math.max(0, c - g);
    },
    formatDetail: (v) => v > 0 ? `JOD ${Math.round(v).toLocaleString()} net` : 'Fully covered',
  },
};

/**
 * Default scoring configuration — array of 5 criteria slots.
 * Each slot: { indicator: keyof SCORE_INDICATORS, max: pts, cap: threshold }
 */
export const DEFAULT_SCORE_CONFIG = [
  { indicator: 'energyGain',        max: 30, cap: 45     },
  { indicator: 'area',              max: 15, cap: 5000   },
  { indicator: 'dataCompleteness',  max: 15, cap: 100    },
  { indicator: 'costEffectiveness', max: 20, cap: 8      },
  { indicator: 'peebTier',          max: 20, cap: 4      },
];

/**
 * PEEB composite score 0–100.
 * Returns { total, breakdown[] } — breakdown is an ordered array matching scoreConfig slots.
 * @param {object}   building    — raw building object
 * @param {object}   calc        — output of calculateBuilding()
 * @param {Array}    [scoreConfig] — array of criterion slots (default: DEFAULT_SCORE_CONFIG)
 */
export function calculateScore(building, calc, scoreConfig = DEFAULT_SCORE_CONFIG) {
  const cfg = Array.isArray(scoreConfig) ? scoreConfig : DEFAULT_SCORE_CONFIG;

  const breakdown = cfg.map((criterion) => {
    const ind = SCORE_INDICATORS[criterion.indicator];
    if (!ind) {
      return { pts: 0, max: criterion.max, label: 'Unknown indicator', detail: '—', indicator: criterion.indicator };
    }

    const rawValue = ind.getValue(building, calc);
    let pct;
    if (ind.direction === 'lower') {
      // Less is better: full score at 0, zero score at cap
      pct = isFinite(rawValue) && rawValue > 0
        ? Math.max(0, (criterion.cap - rawValue) / criterion.cap)
        : (rawValue <= 0 ? 1 : 0);
    } else {
      // More is better: full score at cap
      pct = criterion.cap > 0 ? Math.min(rawValue / criterion.cap, 1) : 0;
    }

    const pts = +(pct * criterion.max).toFixed(1);
    const detail = ind.formatDetail(rawValue, building, calc);

    return { pts, max: criterion.max, label: ind.label, detail, indicator: criterion.indicator, direction: ind.direction };
  });

  const total = Math.round(breakdown.reduce((s, b) => s + b.pts, 0));
  return { total, breakdown };
}

export function suggestDefaults(typology) {
  return TYPOLOGY_DEFAULTS[typology] || null;
}

export function parseEdgeExport(content, fileType) {
  if (fileType === 'json') {
    try { const p = JSON.parse(content); return Array.isArray(p) ? p : [p]; }
    catch { return null; }
  }
  if (fileType === 'csv') {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, h, i) => {
        const raw = vals[i];
        obj[h] = raw === '' ? null : isNaN(Number(raw)) ? raw : Number(raw);
        return obj;
      }, {});
    });
  }
  return null;
}

export function aggregateKPIs(results) {
  return results.reduce(
    (acc, r) => ({
      totalArea:       acc.totalArea       + (r.area || 0),
      totalCO2Avoided: +(acc.totalCO2Avoided + (r.calc?.co2AvoidedTon || 0)).toFixed(2),
      totalPEEBGrant:  +(acc.totalPEEBGrant  + (r.calc?._jod?.peebGrant || 0)).toFixed(2),
      totalCapex:      +(acc.totalCapex      + (r.calc?._jod?.capex || 0)).toFixed(2),
      totalSavings:    +(acc.totalSavings    + (r.calc?._jod?.annualSavings || 0)).toFixed(2),
      buildingCount:   acc.buildingCount + 1,
    }),
    { totalArea: 0, totalCO2Avoided: 0, totalPEEBGrant: 0, totalCapex: 0, totalSavings: 0, buildingCount: 0 }
  );
}

export function formatCurrency(value, currency, compact = false) {
  if (value === null || value === undefined) return '—';
  const opts = compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
  const sym = currency === 'EUR' ? '€' : 'JOD';
  return `${sym} ${new Intl.NumberFormat('en-JO', opts).format(value)}`;
}
