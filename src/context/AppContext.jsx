import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { INITIAL_BUILDINGS } from '../data/sampleData';
import {
  calculateBuilding, checkEligibility, detectDataGaps,
  DEFAULT_SCORE_CONFIG, SCORE_INDICATORS,
  buildDefaultSavingsByTypology,
  DEFAULT_BUDGET_CONFIG,
  MEASURE_KEYS, TYPOLOGY_DEFAULTS,
} from '../engine/CalculationEngine';
import * as db from '../lib/db';

// ─── Draft builder ─────────────────────────────────────────────────────────────
function makeDraft(id) {
  const typology = 'School';
  const defaults = TYPOLOGY_DEFAULTS[typology] || {};
  const measures = {};
  for (const k of MEASURE_KEYS) {
    const d = defaults[k] || {};
    measures[k] = {
      selected:    false,
      capex:       d.capex ?? 0,
      savingsRate: d.savingsRate ?? 0,
      notes:       '',
    };
  }
  return {
    id,
    isDraft:        true,
    name:           '',
    typology,
    governorate:    '',
    region:         '',
    address:        '',
    coordinates:    null,
    area:           null,
    yearBuilt:      null,
    floors:         null,
    baselineEUI:    defaults.baselineEUI ?? null,
    operatingHours: '',
    lat:            null,
    lng:            null,
    fundingSource:  '',
    status:         'Planning',
    priority:       'Medium',
    siteObservations: '',
    images:         [],
    manuallyIneligible: false,
    peebSelected:   false,
    afdLoan:        0,
    nationalBudget: 0,
    others:         0,
    measures,
  };
}

function slugId(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

// ─── Default parameters ────────────────────────────────────────────────────────
const DEFAULT_PARAMS = {
  currency:     'EUR',
  exchangeRate: 1.36,
  energyCost:   0.085,
  unitCosts: {
    insulation:         25,
    windows:            80,
    hvac:               130,
    lighting:           20,
    pv:                 150,
    solarThermal:       120,
    structure:          130,
    accessibility:      70,
    hygieneAndSecurity: 60,
  },
  scoreConfig:       DEFAULT_SCORE_CONFIG.map(c => ({ ...c })),
  savingsByTypology: buildDefaultSavingsByTypology(),
  budgetConfig:      {
    items: DEFAULT_BUDGET_CONFIG.items.map(i => ({ ...i, appliesTo: [...i.appliesTo] })),
    contingencyProject: { ...DEFAULT_BUDGET_CONFIG.contingencyProject },
  },
};

// Merge loaded params onto defaults so missing keys always have a value
function mergeParams(defaults, loaded) {
  if (!loaded) return defaults;
  return {
    ...defaults,
    ...loaded,
    unitCosts:          { ...defaults.unitCosts,          ...(loaded.unitCosts          || {}) },
    scoreConfig:        loaded.scoreConfig        || defaults.scoreConfig,
    savingsByTypology:  loaded.savingsByTypology  || defaults.savingsByTypology,
    budgetConfig:       loaded.budgetConfig       || defaults.budgetConfig,
  };
}

// ─── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  params:       DEFAULT_PARAMS,
  buildings:    [],           // populated from Supabase on mount
  selectedId:   null,
  view:         'dashboard',
  notification: null,
  loading:      true,         // true while initial Supabase fetch is in flight
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    // Supabase initial load — replaces in-memory placeholder with DB data
    case 'INIT':
      return {
        ...state,
        buildings: action.buildings ?? state.buildings,
        params:    mergeParams(state.params, action.params),
        loading:   false,
      };

    case 'INIT_ERROR':
      return { ...state, loading: false };

    // Navigation
    case 'SET_VIEW':
      return { ...state, view: action.view, selectedId: action.id ?? state.selectedId };

    case 'SELECT_BUILDING':
      return { ...state, selectedId: action.id, view: 'profile' };

    // Parameters
    case 'SET_PARAM':
      return { ...state, params: { ...state.params, [action.key]: action.value } };

    case 'SET_UNIT_COST':
      return {
        ...state,
        params: {
          ...state.params,
          unitCosts: { ...state.params.unitCosts, [action.measure]: action.value },
        },
      };

    case 'SET_SCORE_CRITERION':
      return {
        ...state,
        params: {
          ...state.params,
          scoreConfig: state.params.scoreConfig.map((c, i) =>
            i === action.index ? { ...c, ...action.patch } : c
          ),
        },
      };

    case 'ADD_SCORE_CRITERION':
      return {
        ...state,
        params: {
          ...state.params,
          scoreConfig: [...state.params.scoreConfig, action.criterion],
        },
      };

    case 'DELETE_SCORE_CRITERION':
      return {
        ...state,
        params: {
          ...state.params,
          scoreConfig: state.params.scoreConfig.filter((_, i) => i !== action.index),
        },
      };

    case 'SET_SAVINGS_RATE':
      return {
        ...state,
        params: {
          ...state.params,
          savingsByTypology: {
            ...state.params.savingsByTypology,
            [action.typology]: {
              ...(state.params.savingsByTypology?.[action.typology] ?? {}),
              [action.measure]: action.value,
            },
          },
        },
      };

    case 'RESET_SAVINGS_MATRIX':
      return {
        ...state,
        params: { ...state.params, savingsByTypology: buildDefaultSavingsByTypology() },
      };

    case 'SET_BUDGET_ITEM': {
      const items = (state.params.budgetConfig?.items ?? []).map((it, i) =>
        i === action.index ? { ...it, ...action.patch } : it
      );
      return {
        ...state,
        params: { ...state.params, budgetConfig: { ...state.params.budgetConfig, items } },
      };
    }

    case 'ADD_BUDGET_ITEM': {
      const items = [...(state.params.budgetConfig?.items ?? []), action.item];
      return {
        ...state,
        params: { ...state.params, budgetConfig: { ...state.params.budgetConfig, items } },
      };
    }

    case 'DELETE_BUDGET_ITEM': {
      const items = (state.params.budgetConfig?.items ?? []).filter((_, i) => i !== action.index);
      return {
        ...state,
        params: { ...state.params, budgetConfig: { ...state.params.budgetConfig, items } },
      };
    }

    case 'SET_BUDGET_CONTINGENCY': {
      const cp = { ...(state.params.budgetConfig?.contingencyProject ?? {}), ...action.patch };
      return {
        ...state,
        params: { ...state.params, budgetConfig: { ...state.params.budgetConfig, contingencyProject: cp } },
      };
    }

    // Building mutations
    case 'UPDATE_BUILDING':
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === action.id ? { ...b, ...action.patch } : b
        ),
      };

    case 'TOGGLE_MEASURE': {
      const building = state.buildings.find(b => b.id === action.id);
      if (!building) return state;
      const m = building.measures[action.measure];
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === action.id
            ? { ...b, measures: { ...b.measures, [action.measure]: { ...m, selected: !m.selected } } }
            : b
        ),
      };
    }

    case 'SET_MEASURE_VALUE': {
      const building = state.buildings.find(b => b.id === action.id);
      if (!building) return state;
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === action.id
            ? {
                ...b,
                measures: {
                  ...b.measures,
                  [action.measure]: { ...b.measures[action.measure], [action.field]: action.value },
                },
              }
            : b
        ),
      };
    }

    case 'ADD_BUILDINGS':
      return {
        ...state,
        buildings: [
          ...state.buildings,
          ...action.buildings.filter(nb => !state.buildings.find(b => b.id === nb.id)),
        ],
        notification: { type: 'success', message: `${action.buildings.length} building(s) imported from EDGE.` },
      };

    case 'ADD_BUILDING':
      return {
        ...state,
        buildings: [...state.buildings, action.building],
        selectedId: action.building.id,
      };

    case 'DELETE_BUILDING': {
      const deleted = state.buildings.find(b => b.id === action.id);
      const wasSelected = state.selectedId === action.id;
      return {
        ...state,
        buildings: state.buildings.filter(b => b.id !== action.id),
        selectedId: wasSelected ? null : state.selectedId,
        view: wasSelected && state.view === 'profile' ? 'inventory' : state.view,
        notification: deleted
          ? { type: 'success', message: `"${deleted.name}" deleted from the database.` }
          : state.notification,
      };
    }

    // Draft building lifecycle
    case 'CREATE_DRAFT': {
      const existing = state.buildings.find(b => b.isDraft);
      if (existing) {
        return { ...state, selectedId: existing.id, view: 'new-building' };
      }
      const id = `draft-${Date.now()}`;
      return {
        ...state,
        buildings: [...state.buildings, makeDraft(id)],
        selectedId: id,
        view: 'new-building',
      };
    }

    case 'FINALIZE_DRAFT': {
      const draft = state.buildings.find(b => b.id === action.id);
      if (!draft) return state;
      const base = slugId(draft.name) || draft.id;
      const existingIds = new Set(state.buildings.map(b => b.id).filter(x => x !== draft.id));
      let newId = base, i = 2;
      while (existingIds.has(newId)) { newId = `${base}-${i++}`; }
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === draft.id ? { ...b, id: newId, isDraft: false } : b
        ),
        selectedId: newId,
        view: 'profile',
        notification: { type: 'success', message: `"${draft.name}" saved to the database.` },
      };
    }

    case 'DISCARD_DRAFT':
      return {
        ...state,
        buildings: state.buildings.filter(b => !(b.isDraft && b.id === action.id)),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };

    case 'APPLY_IMPORT': {
      const updatedIds = new Set(action.updated.map(b => b.id));
      const merged = state.buildings.map(b => updatedIds.has(b.id)
        ? action.updated.find(u => u.id === b.id)
        : b);
      return {
        ...state,
        buildings: [...merged, ...action.added],
        notification: action.notify
          ? { type: 'success', message: action.notify }
          : state.notification,
      };
    }

    case 'ADD_BUILDING_IMAGE': {
      const building = state.buildings.find(b => b.id === action.id);
      if (!building) return state;
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === action.id
            ? { ...b, images: [...b.images, action.url] }
            : b
        ),
      };
    }

    case 'REMOVE_BUILDING_IMAGE':
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === action.id
            ? { ...b, images: b.images.filter((_, i) => i !== action.index) }
            : b
        ),
      };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Always-fresh ref to state — used by async callbacks to avoid stale closures
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Tracks which building ids need to be persisted after the next render
  const pendingSaves = useRef(new Set());

  // Prevents Supabase writes during the initial data load
  const initializedRef = useRef(false);

  // Debounce timer for params persistence
  const paramsSaveTimerRef = useRef(null);

  // ── Initial load from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [buildings, params] = await Promise.all([
          db.loadBuildings(),
          db.loadParams(),
        ]);
        if (cancelled) return;
        // Seed Supabase with sample data on first run if the DB is empty
        if (buildings.length === 0) {
          await db.saveBuildings(INITIAL_BUILDINGS);
          dispatch({ type: 'INIT', buildings: INITIAL_BUILDINGS, params });
        } else {
          dispatch({ type: 'INIT', buildings, params });
        }
      } catch (err) {
        if (cancelled) return;
        dispatch({ type: 'INIT_ERROR' });
        dispatch({
          type: 'SET_NOTIFICATION',
          payload: { type: 'error', message: `Failed to load data: ${err.message}` },
        });
      } finally {
        if (!cancelled) initializedRef.current = true;
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // ── Persist pending building saves after each state update ─────────────────
  // After a dispatch mutates state.buildings, this effect reads the
  // already-updated buildings from `state` and pushes them to Supabase.
  useEffect(() => {
    if (!initializedRef.current || pendingSaves.current.size === 0) return;
    const ids = [...pendingSaves.current];
    pendingSaves.current.clear();
    ids.forEach(id => {
      const b = state.buildings.find(b => b.id === id);
      if (b && !b.isDraft) {
        db.saveBuilding(b).catch(err => {
          dispatch({
            type: 'SET_NOTIFICATION',
            payload: { type: 'error', message: `Sync error: ${err.message}` },
          });
        });
      }
    });
  }, [state.buildings]);

  // ── Debounced params persistence ────────────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current) return;
    clearTimeout(paramsSaveTimerRef.current);
    paramsSaveTimerRef.current = setTimeout(() => {
      db.saveParams(stateRef.current.params).catch(err =>
        console.error('Params sync error:', err)
      );
    }, 800);
  }, [state.params]);

  // ── Enriched buildings (memoised) ───────────────────────────────────────────
  const enrichedBuildings = useMemo(() =>
    state.buildings.map(b => ({
      ...b,
      gaps:        detectDataGaps(b),
      eligibility: checkEligibility(b),
      calc:        calculateBuilding({ building: b, measures: b.measures, params: state.params }),
    })),
    [state.buildings, state.params]
  );

  const selectedBuilding = enrichedBuildings.find(b => b.id === state.selectedId) || null;

  const getCalcResult = useCallback((buildingId) => {
    const b = stateRef.current.buildings.find(b => b.id === buildingId);
    if (!b) return null;
    return calculateBuilding({ building: b, measures: b.measures, params: stateRef.current.params });
  }, []);

  // ── Async-aware action helpers ──────────────────────────────────────────────
  // Each helper dispatches immediately (optimistic UI) then queues a DB save.

  const scheduleSave = useCallback((id) => {
    pendingSaves.current.add(id);
  }, []);

  const updateBuilding = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_BUILDING', id, patch });
    scheduleSave(id);
  }, [scheduleSave]);

  const toggleMeasure = useCallback((id, measure) => {
    dispatch({ type: 'TOGGLE_MEASURE', id, measure });
    scheduleSave(id);
  }, [scheduleSave]);

  const setMeasureValue = useCallback((id, measure, field, value) => {
    dispatch({ type: 'SET_MEASURE_VALUE', id, measure, field, value });
    scheduleSave(id);
  }, [scheduleSave]);

  const addBuilding = useCallback((building) => {
    dispatch({ type: 'ADD_BUILDING', building });
    scheduleSave(building.id);
  }, [scheduleSave]);

  const deleteBuilding = useCallback((id) => {
    dispatch({ type: 'DELETE_BUILDING', id });
    if (initializedRef.current) {
      db.deleteBuilding(id).catch(err => {
        dispatch({
          type: 'SET_NOTIFICATION',
          payload: { type: 'error', message: `Delete sync error: ${err.message}` },
        });
      });
    }
  }, []);

  const finalizeDraft = useCallback((id) => {
    dispatch({ type: 'FINALIZE_DRAFT', id });
    // The draft gets a new slug-based id after FINALIZE_DRAFT; we need the
    // finalized building from state after the re-render to persist it.
    // We schedule a save for the OLD id first, then the reducer replaces it,
    // and the useEffect catches the NEW id via the diff in state.buildings.
    // Simpler: just re-fetch the finalized building after dispatch by name.
    // We store the draft name before dispatch so we can look it up.
    const draft = stateRef.current.buildings.find(b => b.id === id);
    if (draft) scheduleSave(`${slugId(draft.name) || id}`);
  }, [scheduleSave]);

  const addBuildings = useCallback((list) => {
    dispatch({ type: 'ADD_BUILDINGS', buildings: list });
    if (initializedRef.current) {
      db.saveBuildings(list).catch(err => {
        dispatch({
          type: 'SET_NOTIFICATION',
          payload: { type: 'error', message: `EDGE import sync error: ${err.message}` },
        });
      });
    }
  }, []);

  const applyImport = useCallback((added, updated, notify) => {
    dispatch({ type: 'APPLY_IMPORT', added, updated, notify });
    if (initializedRef.current) {
      db.saveBuildings([...added, ...updated]).catch(err => {
        dispatch({
          type: 'SET_NOTIFICATION',
          payload: { type: 'error', message: `Import sync error: ${err.message}` },
        });
      });
    }
  }, []);

  const addImage = useCallback((id, url) => {
    dispatch({ type: 'ADD_BUILDING_IMAGE', id, url });
    scheduleSave(id);
  }, [scheduleSave]);

  const removeImage = useCallback((id, index) => {
    dispatch({ type: 'REMOVE_BUILDING_IMAGE', id, index });
    scheduleSave(id);
  }, [scheduleSave]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      params:            state.params,
      view:              state.view,
      loading:           state.loading,
      buildings:         enrichedBuildings,
      selectedBuilding,
      notification:      state.notification,
      getCalcResult,
      // Navigation
      navigate:          (view, id)   => dispatch({ type: 'SET_VIEW', view, id }),
      selectBuilding:    (id)         => dispatch({ type: 'SELECT_BUILDING', id }),
      // Parameters (persisted via debounced effect)
      setParam:          (key, value) => dispatch({ type: 'SET_PARAM', key, value }),
      setUnitCost:       (measure, val)           => dispatch({ type: 'SET_UNIT_COST', measure, value: val }),
      setScoreCriterion:    (index, patch) => dispatch({ type: 'SET_SCORE_CRITERION', index, patch }),
      addScoreCriterion:    (criterion)    => dispatch({ type: 'ADD_SCORE_CRITERION', criterion }),
      deleteScoreCriterion: (index)        => dispatch({ type: 'DELETE_SCORE_CRITERION', index }),
      setSavingsRate:    (typology, measure, value) =>
        dispatch({ type: 'SET_SAVINGS_RATE', typology, measure, value }),
      resetSavingsMatrix: () => dispatch({ type: 'RESET_SAVINGS_MATRIX' }),
      setBudgetItem:       (index, patch) => dispatch({ type: 'SET_BUDGET_ITEM', index, patch }),
      addBudgetItem:       (item)         => dispatch({ type: 'ADD_BUDGET_ITEM', item }),
      deleteBudgetItem:    (index)        => dispatch({ type: 'DELETE_BUDGET_ITEM', index }),
      setBudgetContingency:(patch)        => dispatch({ type: 'SET_BUDGET_CONTINGENCY', patch }),
      // Building mutations (persisted to Supabase)
      updateBuilding,
      toggleMeasure,
      setMeasureValue,
      addBuildings,
      addBuilding,
      deleteBuilding,
      createDraft:       ()           => dispatch({ type: 'CREATE_DRAFT' }),
      finalizeDraft,
      discardDraft:      (id)         => dispatch({ type: 'DISCARD_DRAFT', id }),
      applyImport,
      addImage,
      removeImage,
      // Notifications
      notify: (type, message) =>
        dispatch({ type: 'SET_NOTIFICATION', payload: { type, message } }),
      clearNotification: () => dispatch({ type: 'CLEAR_NOTIFICATION' }),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};
