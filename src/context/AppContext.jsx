import { createContext, useContext, useReducer, useCallback } from 'react';
import { INITIAL_BUILDINGS } from '../data/sampleData';
import { calculateBuilding, checkEligibility, detectDataGaps } from '../engine/CalculationEngine';

// ─── Default parameters ────────────────────────────────────────────────────────
const DEFAULT_PARAMS = {
  currency:     'JOD',
  exchangeRate: 1.36,          // 1 JOD ≈ 1.36 EUR
  energyCost:   0.085,         // JOD / kWh (Jordan residential/commercial average)
  unitCosts: {
    insulation:       25,
    windows:          80,
    hvac:             130,
    lighting:         20,
    pv:               150,
    globalRenovation: 260,
  },
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
      setUnitCost: (measure, val)  => dispatch({ type: 'SET_UNIT_COST', measure, value: val }),
      updateBuilding: (id, patch)  => dispatch({ type: 'UPDATE_BUILDING', id, patch }),
      toggleMeasure:  (id, msr)    => dispatch({ type: 'TOGGLE_MEASURE', id, measure: msr }),
      setMeasureValue:(id, msr, field, val) =>
        dispatch({ type: 'SET_MEASURE_VALUE', id, measure: msr, field, value: val }),
      addBuildings:   (list)       => dispatch({ type: 'ADD_BUILDINGS', buildings: list }),
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
