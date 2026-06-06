/**
 * PEEB Med Jordan — Calculation Engine  (v2)
 * Pure, side-effect-free functions for all energy-efficiency maths.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const CO2_FACTOR = 0.7 / 1000; // tCO₂ / kWh (Jordan grid)

export const FUNDING_TIERS = [
  { minGain:  0, maxGain: 30,       grantRate: 0.00, label: 'No grant',  color: 'slate'  },
  { minGain: 30, maxGain: 35,       grantRate: 0.50, label: '50% grant', color: 'amber'  },
  { minGain: 35, maxGain: 40,       grantRate: 0.60, label: '60% grant', color: 'blue'   },
  { minGain: 40, maxGain: 45,       grantRate: 0.70, label: '70% grant', color: 'green'  },
  { minGain: 45, maxGain: Infinity, grantRate: 0.80, label: '80% grant', color: 'purple' },
];

/** EE measures — contribute to energy gain & PEEB grant */
export const MEASURE_KEYS_EE = ['insulation', 'windows', 'hvac', 'lighting', 'pv', 'solarThermal'];

/** EE core measures (Energy Efficiency excluding renewables) — UI grouping only */
export const MEASURE_KEYS_EE_CORE = ['insulation', 'windows', 'hvac', 'lighting'];

/** Renewable energy measures — UI grouping; still part of MEASURE_KEYS_EE for calc */
export const MEASURE_KEYS_RE = ['pv', 'solarThermal'];

/** Global Refurbishment measures — 0% energy savings, non-EE capex, eligible for AFD */
export const MEASURE_KEYS_GR = ['structure', 'accessibility', 'hygieneAndSecurity'];

export const MEASURE_KEYS = [...MEASURE_KEYS_EE, ...MEASURE_KEYS_GR];

export const MEASURE_META = {
  // ── Energy Efficiency ──────────────────────────────────────────────────────
  insulation:         { label: 'Roof / Wall Insulation',  short: 'Insulat°',      unit: 'JOD/m²', icon: 'Layers',      isEE: true,  lockSavings: false },
  windows:            { label: 'Window Replacement',      short: 'Windows',       unit: 'JOD/m²', icon: 'Grid2X2',     isEE: true,  lockSavings: false },
  hvac:               { label: 'HVAC Upgrade',            short: 'HVAC',          unit: 'JOD/m²', icon: 'Wind',        isEE: true,  lockSavings: false },
  lighting:           { label: 'LED Lighting',            short: 'Lighting',      unit: 'JOD/m²', icon: 'Lightbulb',   isEE: true,  lockSavings: false },
  pv:                 { label: 'PV Solar System',         short: 'PV',            unit: 'JOD/m²', icon: 'Sun',         isEE: true,  lockSavings: false },
  solarThermal:       { label: 'Solar Thermal (hot water)', short: 'Solar Th°',   unit: 'JOD/m²', icon: 'Droplets',   isEE: true,  lockSavings: false },
  // ── Global Refurbishment (0 % energy savings, locked) ─────────────────────
  structure:          { label: 'Structure',               short: 'Struct°',       unit: 'JOD/m²', icon: 'Building2',   isEE: false, lockSavings: true  },
  accessibility:      { label: 'Accessibility',           short: 'Access°',       unit: 'JOD/m²', icon: 'Accessibility', isEE: false, lockSavings: true },
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
  Administration: {
    baselineEUI: 120,
    insulation:         { capex: 27,  savingsRate: 0.13 },
    windows:            { capex: 84,  savingsRate: 0.12 },
    hvac:               { capex: 135, savingsRate: 0.27 },
    lighting:           { capex: 22,  savingsRate: 0.32 },
    pv:                 { capex: 148, savingsRate: 0.21 },
    solarThermal:       { capex: 118, savingsRate: 0.05 },
    structure:          { capex: 135, savingsRate: 0 },
    accessibility:      { capex: 72,  savingsRate: 0 },
    hygieneAndSecurity: { capex: 62,  savingsRate: 0 },
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

/** Normalize legacy typology values to the harmonized set. */
export function normalizeTypology(t) {
  if (t === 'Office' || t === 'Municipality') return 'Administration';
  return t;
}

export const DONOR_MARKERS = ['GIZ', 'KfW', 'USAID', 'EU', 'World Bank', 'EBRD', 'AFD'];

// ─── Core Calculation Functions ───────────────────────────────────────────────

/**
 * Thermal Synergy is disabled — savings are user-driven now.
 * Kept as a passthrough so the rest of the engine doesn't need restructuring.
 */
export function applyThermalSynergy(measures) {
  return { measures, synergyApplied: false };
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

/**
 * Split the EE compound gain between PV and the rest of the EE measures.
 * Returns { ee, pv } in % — both based on the compound model, regardless of any
 * override on the building's total energy gain (those are kept for display only).
 */
export function calculateGainSplit(measures) {
  const { measures: syn } = applyThermalSynergy(measures);
  let residualEE = 1.0;
  let pvGain = 0;
  MEASURE_KEYS_EE.forEach(key => {
    const m = syn[key];
    if (!m?.selected || !(m.savingsRate > 0)) return;
    if (key === 'pv') pvGain = m.savingsRate;
    else residualEE *= (1 - m.savingsRate);
  });
  return {
    ee: +((1 - residualEE) * 100).toFixed(2),
    pv: +(pvGain * 100).toFixed(2),
  };
}

export function getFundingTier(gainPercent) {
  return FUNDING_TIERS.find(t => gainPercent >= t.minGain && gainPercent < t.maxGain) || FUNDING_TIERS[0];
}

/**
 * CAPEX split: { ee, gr, perM2, total } — all in JOD.
 * PEEB grant is applied to EE capex only.
 *
 * Each measure stores `capex` (JOD/m²) and `capexAbsolute` (total JOD).
 * When the building area > 0 the per-m² value drives the total (capex × area).
 * When area is unknown the absolute value is used directly.
 */
function measureTotal(m, area) {
  if (!m?.selected) return 0;
  if (area && area > 0 && (m.capex || m.capex === 0)) return (m.capex || 0) * area;
  return m.capexAbsolute || 0;
}

export function calculateCapex(measures, area) {
  const { measures: syn } = applyThermalSynergy(measures);

  const eeTotal = MEASURE_KEYS_EE.reduce((s, k) => s + measureTotal(syn[k], area), 0);
  const grTotal = MEASURE_KEYS_GR.reduce((s, k) => s + measureTotal(measures[k], area), 0);
  const total   = eeTotal + grTotal;
  const safeArea = area && area > 0 ? area : null;

  return {
    ee:    { perM2: safeArea ? +(eeTotal / safeArea).toFixed(2) : 0, total: +eeTotal.toFixed(2) },
    gr:    { perM2: safeArea ? +(grTotal / safeArea).toFixed(2) : 0, total: +grTotal.toFixed(2) },
    perM2: safeArea ? +(total / safeArea).toFixed(2) : 0,
    total: +total.toFixed(2),
  };
}

/**
 * Full building calculation.
 * params.others — additional funding source (JOD)
 */
export function calculateBuilding({ building, measures, params }) {
  const { area, baselineEUI } = building;
  const { currency, exchangeRate, energyCost } = params;
  // Read per-building funding values — NOT from global params (which don't store them)
  const afdLoan        = building.afdLoan        ?? 0;
  const nationalBudget = building.nationalBudget ?? 0;
  const others         = building.others         ?? 0;

  // Savings rates are user-driven only — no automatic typology-based override.
  const measuresWithTyp = measures;

  const { measures: synMeasures, synergyApplied } = applyThermalSynergy(measuresWithTyp);

  // Energy gain resolution order:
  //   1. Manual override on the building (gainOverride)
  //   2. Derived from total kWh fields (Baseline − Project) / Baseline
  //   3. Compound EE measures model
  let energyGain;
  if (typeof building.gainOverride === 'number' && !Number.isNaN(building.gainOverride)) {
    energyGain = +building.gainOverride.toFixed(2);
  } else if (
    typeof building.totalBaselineKwh === 'number' && building.totalBaselineKwh > 0 &&
    typeof building.totalProjectKwh === 'number'
  ) {
    energyGain = +((1 - building.totalProjectKwh / building.totalBaselineKwh) * 100).toFixed(2);
  } else {
    energyGain = calculateEnergyGain(measuresWithTyp);
  }
  const tier       = getFundingTier(energyGain);
  const capexJOD   = calculateCapex(measuresWithTyp, area);

  // Optional manual override on the EE CAPEX total (replaces the per-measure sum)
  if (typeof building.eeCapexOverride === 'number' && building.eeCapexOverride >= 0) {
    capexJOD.ee.total = +building.eeCapexOverride.toFixed(2);
    capexJOD.ee.perM2 = area > 0 ? +(capexJOD.ee.total / area).toFixed(2) : 0;
    capexJOD.total    = +(capexJOD.ee.total + capexJOD.gr.total).toFixed(2);
    capexJOD.perM2    = area > 0 ? +(capexJOD.total / area).toFixed(2) : 0;
  }

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

  // PV's "complementary" gain expressed against the baseline consumption.
  //   user input q  = PV production as a share of the project (post-EE) consumption
  //   Z (display)   = q × (1 − EE/100) × 100  → share of the baseline consumption
  //   Total Gain    = EE + Z  (additive once Z is in baseline-share units;
  //                            equivalent to the compound 1 − (1 − EE)(1 − q))
  const { pv: pvQpct } = calculateGainSplit(measuresWithTyp);
  const gainPV    = +(pvQpct * (1 - energyGain / 100)).toFixed(2);
  const gainTotal = +Math.min(100, energyGain + gainPV).toFixed(2);

  return {
    energyGain,
    gainEE:    energyGain,   // headline EE gain = resolved Total Energy Saving
    gainPV,                  // complementary PV gain expressed against baseline
    gainTotal,               // EE + complementary PV (capped at 100%)
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
  if (building.fundingSource)
    return { ineligible: true, donor: building.fundingSource, reason: 'donor' };
  return { ineligible: false, donor: null, reason: null };
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
    label: 'PEEB Grant Rate',
    unit: 'tier (0–4)',
    direction: 'higher',
    defaultCap: 4,
    capLabel: 'Full score at top grant rate (max = 4)',
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
    getValue: (b) => b.yearBuilt ? (new Date().getFullYear() - b.yearBuilt) : 0,
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

// ─── Budget configuration ─────────────────────────────────────────────────────
// Project budget = sum of works (EE + GR) + user-defined line items (design, contingencies, …).
// Each item is either an absolute amount or a % of a set of other items.
// `contingency_project` is reserved and always applies to every preceding item.

export const BUDGET_BASE_ITEMS = [
  { id: 'ee_works', label: 'Energy-efficiency works' },
  { id: 'gr_works', label: 'Other refurbishment works' },
];

export const DEFAULT_BUDGET_CONFIG = {
  items: [
    { id: 'design_supervision', label: 'Design and supervision', type: 'percent', value: 10, appliesTo: ['ee_works', 'gr_works'] },
    { id: 'contingency_works',  label: 'Contingency on works',   type: 'percent', value: 10, appliesTo: ['ee_works', 'gr_works'] },
  ],
  contingencyProject: { label: 'Contingency on project', value: 5 },
};

/**
 * Compute the ordered budget breakdown for a project.
 * @param baseAmounts { ee_works, gr_works } — works totals in display currency
 * @param config { items[], contingencyProject }
 * @returns { rows: [{ id, label, amount, type?, value?, appliesTo?, locked?, base? }], total }
 */
export function computeBudgetBreakdown(baseAmounts, config) {
  const cfg = config ?? DEFAULT_BUDGET_CONFIG;
  const rows = BUDGET_BASE_ITEMS.map(b => ({
    id: b.id, label: b.label, amount: +(baseAmounts?.[b.id] || 0), base: true,
  }));
  const map = Object.fromEntries(rows.map(r => [r.id, r.amount]));

  for (const item of (cfg.items ?? [])) {
    let amount = 0;
    if (item.type === 'absolute') {
      amount = +item.value || 0;
    } else {
      const base = (item.appliesTo ?? []).reduce((s, id) => s + (map[id] || 0), 0);
      amount = base * ((+item.value || 0) / 100);
    }
    map[item.id] = amount;
    rows.push({
      id: item.id, label: item.label, amount,
      type: item.type ?? 'percent',
      value: item.value ?? 0,
      appliesTo: item.appliesTo ?? [],
    });
  }

  const cp = cfg.contingencyProject ?? DEFAULT_BUDGET_CONFIG.contingencyProject;
  const cpBase = rows.reduce((s, r) => s + r.amount, 0);
  const cpAmount = cpBase * ((+cp.value || 0) / 100);
  rows.push({
    id: 'contingency_project',
    label: cp.label ?? 'Contingency on project',
    amount: cpAmount,
    type: 'percent',
    value: cp.value ?? 0,
    appliesTo: rows.map(r => r.id),
    locked: true,
  });

  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total };
}

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
