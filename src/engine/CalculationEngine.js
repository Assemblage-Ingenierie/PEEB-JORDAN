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
export const MEASURE_KEYS_EE = ['insulation', 'windows', 'hvac', 'lighting', 'pv'];

/** Global Refurbishment measures — 0% energy savings, non-EE capex, eligible for AFD */
export const MEASURE_KEYS_GR = ['structure', 'accessibility', 'hygieneAndSecurity'];

export const MEASURE_KEYS = [...MEASURE_KEYS_EE, ...MEASURE_KEYS_GR];

export const MEASURE_META = {
  // ── Energy Efficiency ──────────────────────────────────────────────────────
  insulation:         { label: 'Roof / Wall Insulation', unit: 'JOD/m²', icon: 'Layers',      isEE: true,  lockSavings: false },
  windows:            { label: 'Window Replacement',     unit: 'JOD/m²', icon: 'Square',      isEE: true,  lockSavings: false },
  hvac:               { label: 'HVAC Upgrade',           unit: 'JOD/m²', icon: 'Wind',        isEE: true,  lockSavings: false },
  lighting:           { label: 'LED Lighting',           unit: 'JOD/m²', icon: 'Lightbulb',   isEE: true,  lockSavings: false },
  pv:                 { label: 'PV Solar System',        unit: 'JOD/m²', icon: 'Sun',         isEE: true,  lockSavings: false },
  // ── Global Refurbishment (0 % energy savings, locked) ─────────────────────
  structure:          { label: 'Structure',              unit: 'JOD/m²', icon: 'Building2',   isEE: false, lockSavings: true  },
  accessibility:      { label: 'Accessibility',          unit: 'JOD/m²', icon: 'Accessibility', isEE: false, lockSavings: true },
  hygieneAndSecurity: { label: 'Hygiene & Security',     unit: 'JOD/m²', icon: 'ShieldCheck', isEE: false, lockSavings: true  },
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
    structure:          { capex: 155, savingsRate: 0 },
    accessibility:      { capex: 85,  savingsRate: 0 },
    hygieneAndSecurity: { capex: 70,  savingsRate: 0 },
  },
};

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
  const { area, baselineEUI } = building;
  const { currency, exchangeRate, energyCost, afdLoan = 0, nationalBudget = 0, others = 0 } = params;

  const { measures: synMeasures, synergyApplied } = applyThermalSynergy(measures);
  const energyGain = calculateEnergyGain(measures);
  const tier       = getFundingTier(energyGain);
  const capexJOD   = calculateCapex(measures, area);

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
  if (!building.fundingSource) return { ineligible: false, donor: null };
  const found = DONOR_MARKERS.find(d => building.fundingSource.toUpperCase().includes(d.toUpperCase()));
  return { ineligible: !!found, donor: found || null };
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
  const sym = currency === 'EUR' ? '€' : 'JD';
  return `${sym} ${new Intl.NumberFormat('en-JO', opts).format(value)}`;
}
