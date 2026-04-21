/**
 * PEEB Med Jordan — Supabase data access layer.
 *
 * Mapping convention:
 *   DB columns  → snake_case  (PostgreSQL standard)
 *   JS objects  → camelCase   (app data model)
 *
 * The `measures` column is stored as JSONB with camelCase keys so it maps
 * directly to the JS data model without a translation step.
 */

import { supabase } from './supabase';

// ── DB row → JS object ────────────────────────────────────────────────────────

function dbToJs(row) {
  return {
    id:                 row.id,
    name:               row.name,
    typology:           row.typology,
    governorate:        row.governorate  ?? '',
    region:             row.region       ?? '',
    address:            row.address      ?? '',
    // Rebuild [lat, lng] array expected by the map component
    coordinates:        row.lat != null && row.lng != null ? [row.lat, row.lng] : null,
    lat:                row.lat          ?? null,
    lng:                row.lng          ?? null,
    area:               row.area         ?? null,
    yearBuilt:          row.year_built   ?? null,
    floors:             row.floors       ?? null,
    baselineEUI:        row.baseline_eui ?? null,
    operatingHours:     row.operating_hours  ?? '',
    fundingSource:      row.funding_source   ?? '',
    status:             row.status       ?? 'Planning',
    priority:           row.priority     ?? null,
    siteObservations:   row.site_observations ?? '',
    images:             row.images       ?? [],
    manuallyIneligible: row.manually_ineligible ?? false,
    peebSelected:       row.peeb_selected    ?? false,
    afdLoan:            row.afd_loan         ?? 0,
    nationalBudget:     row.national_budget  ?? 0,
    others:             row.others           ?? 0,
    isDraft:            row.is_draft         ?? false,
    measures:           row.measures         ?? {},
  };
}

// ── JS object → DB row ────────────────────────────────────────────────────────

function jsToDB(b) {
  return {
    id:                  b.id,
    name:                b.name,
    typology:            b.typology,
    governorate:         b.governorate        ?? '',
    region:              b.region             ?? '',
    address:             b.address            ?? '',
    lat:                 b.coordinates?.[0]   ?? b.lat  ?? null,
    lng:                 b.coordinates?.[1]   ?? b.lng  ?? null,
    area:                b.area               ?? null,
    year_built:          b.yearBuilt          ?? null,
    floors:              b.floors             ?? null,
    baseline_eui:        b.baselineEUI        ?? null,
    operating_hours:     b.operatingHours     ?? '',
    funding_source:      b.fundingSource      ?? '',
    status:              b.status             ?? 'Planning',
    priority:            b.priority           ?? null,
    site_observations:   b.siteObservations   ?? '',
    images:              b.images             ?? [],
    manually_ineligible: b.manuallyIneligible ?? false,
    peeb_selected:       b.peebSelected       ?? false,
    afd_loan:            b.afdLoan            ?? 0,
    national_budget:     b.nationalBudget     ?? 0,
    others:              b.others             ?? 0,
    is_draft:            b.isDraft            ?? false,
    measures:            b.measures           ?? {},
  };
}

// ── Buildings ─────────────────────────────────────────────────────────────────

export async function loadBuildings() {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .order('name');
  if (error) throw error;
  return data.map(dbToJs);
}

export async function saveBuilding(building) {
  const { error } = await supabase
    .from('buildings')
    .upsert(jsToDB(building), { onConflict: 'id' });
  if (error) throw error;
}

export async function saveBuildings(buildings) {
  if (!buildings.length) return;
  const { error } = await supabase
    .from('buildings')
    .upsert(buildings.map(jsToDB), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteBuilding(id) {
  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── App Parameters ────────────────────────────────────────────────────────────

export async function loadParams() {
  const { data, error } = await supabase
    .from('app_params')
    .select('*')
    .eq('id', 1)
    .single();
  // PGRST116 = no row found — return null so the caller falls back to defaults
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return {
    currency:           data.currency,
    exchangeRate:       data.exchange_rate,
    energyCost:         data.energy_cost,
    unitCosts:          data.unit_costs,
    scoreConfig:        data.score_config,
    savingsByTypology:  data.savings_by_typology,
    budgetConfig:       data.budget_config,
  };
}

export async function saveParams(params) {
  const { error } = await supabase
    .from('app_params')
    .upsert({
      id:                  1,
      currency:            params.currency,
      exchange_rate:       params.exchangeRate,
      energy_cost:         params.energyCost,
      unit_costs:          params.unitCosts,
      score_config:        params.scoreConfig,
      savings_by_typology: params.savingsByTypology,
      budget_config:       params.budgetConfig,
    }, { onConflict: 'id' });
  if (error) throw error;
}
