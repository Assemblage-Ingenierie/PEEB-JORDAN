import { createContext, useContext, useReducer, useCallback } from 'react';
import { INITIAL_BUILDINGS } from '../data/sampleData';
import {
  calculateBuilding, checkEligibility, detectDataGaps,
  DEFAULT_SCORE_CONFIG, SCORE_INDICATORS,
  buildDefaultSavingsByTypology,
  MEASURE_KEYS, TYPOLOGY_DEFAULTS,
} from '../engine/CalculationEngine';

// ─── Draft builder ─────────────────────────────────────────────────────────────
// Creates a blank building record used by the "New Building" page. Kept in the
// main `buildings` array with isDraft=true so all editable section components
// (which read/write via context) work without special-casing.
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
  currency:     'JOD',
  exchangeRate: 1.36,          // 1 JOD ≈ 1.36 EUR
  energyCost:   0.085,         // JOD / kWh (Jordan residential/commercial average)
  unitCosts: {
    insulation:   25,
    windows:      80,
    hvac:         130,
    lighting:     20,
    pv:           150,
    solarThermal: 120,
  },
  scoreConfig:      DEFAULT_SCORE_CONFIG.map(c => ({ ...c })),
  savingsByTypology: buildDefaultSavingsByTypology(),
};

// ─── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  params:            DEFAULT_PARAMS,
  buildings:         INITIAL_BUILDINGS,
  selectedId:        null,
  view:              'dashboard',   // dashboard | inventory | profile | map | parameters | calculator
  notification:      null,          // { type: 'success'|'error'|'info', message }
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

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
          ? { type: 'success', message: `“${deleted.name}” deleted from the database.` }
          : state.notification,
      };
    }

    // Draft building lifecycle (used by the "New Building" page)
    case 'CREATE_DRAFT': {
      // Re-use the existing draft if the user came back to the page.
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
        notification: { type: 'success', message: `“${draft.name}” saved to the database.` },
      };
    }

    case 'DISCARD_DRAFT': {
      return {
        ...state,
        buildings: state.buildings.filter(b => !(b.isDraft && b.id === action.id)),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }

    case 'APPLY_IMPORT': {
      // action: { added: [...], updated: [...], notify: { message } }
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

    case 'REMOVE_BUILDING_IMAGE': {
      return {
        ...state,
        buildings: state.buildings.map(b =>
          b.id === action.id
            ? { ...b, images: b.images.filter((_, i) => i !== action.index) }
            : b
        ),
      };
    }

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

  // Memoised selector: compute live result for a given building
  const getCalcResult = useCallback((buildingId) => {
    const b = state.buildings.find(b => b.id === buildingId);
    if (!b) return null;
    return calculateBuilding({ building: b, measures: b.measures, params: state.params });
  }, [state.buildings, state.params]);

  // Enrich every building with computed fields (gaps, eligibility)
  const enrichedBuildings = state.buildings.map(b => ({
    ...b,
    gaps:        detectDataGaps(b),
    eligibility: checkEligibility(b),
    calc:        calculateBuilding({ building: b, measures: b.measures, params: state.params }),
  }));

  const selectedBuilding = enrichedBuildings.find(b => b.id === state.selectedId) || null;

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      params:           state.params,
      view:             state.view,
      buildings:        enrichedBuildings,
      selectedBuilding,
      notification:     state.notification,
      getCalcResult,
      // Convenience actions
      navigate:    (view, id)      => dispatch({ type: 'SET_VIEW', view, id }),
      selectBuilding: (id)         => dispatch({ type: 'SELECT_BUILDING', id }),
      setParam:    (key, value)    => dispatch({ type: 'SET_PARAM', key, value }),
      setUnitCost:      (measure, val)    => dispatch({ type: 'SET_UNIT_COST', measure, value: val }),
      setScoreCriterion: (index, patch)  => dispatch({ type: 'SET_SCORE_CRITERION', index, patch }),
      setSavingsRate: (typology, measure, value) =>
        dispatch({ type: 'SET_SAVINGS_RATE', typology, measure, value }),
      resetSavingsMatrix: () => dispatch({ type: 'RESET_SAVINGS_MATRIX' }),
      updateBuilding: (id, patch)  => dispatch({ type: 'UPDATE_BUILDING', id, patch }),
      toggleMeasure:  (id, msr)    => dispatch({ type: 'TOGGLE_MEASURE', id, measure: msr }),
      setMeasureValue:(id, msr, field, val) =>
        dispatch({ type: 'SET_MEASURE_VALUE', id, measure: msr, field, value: val }),
      addBuildings:   (list)       => dispatch({ type: 'ADD_BUILDINGS', buildings: list }),
      addBuilding:    (b)          => dispatch({ type: 'ADD_BUILDING', building: b }),
      deleteBuilding: (id)         => dispatch({ type: 'DELETE_BUILDING', id }),
      createDraft:    ()           => dispatch({ type: 'CREATE_DRAFT' }),
      finalizeDraft:  (id)         => dispatch({ type: 'FINALIZE_DRAFT', id }),
      discardDraft:   (id)         => dispatch({ type: 'DISCARD_DRAFT', id }),
      applyImport:    (added, updated, notify) =>
        dispatch({ type: 'APPLY_IMPORT', added, updated, notify }),
      addImage:       (id, url)    => dispatch({ type: 'ADD_BUILDING_IMAGE', id, url }),
      removeImage:    (id, idx)    => dispatch({ type: 'REMOVE_BUILDING_IMAGE', id, index: idx }),
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
