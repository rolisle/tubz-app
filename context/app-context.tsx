import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_PRODUCTS } from '@/constants/default-products';
import type {
  AppState,
  Location,
  Machine,
  MachineType,
  Product,
  ProductCategory,
  RestockEntry,
  RestockMachineEntry,
} from '@/types';
import { appendLog } from '@/utils/crash-log';
import { uid } from '@/utils/id';
import { rescheduleAllNotifications } from '@/utils/notifications';

const STORAGE_KEY = '@tubz:appState';

const initialState: AppState = {
  locations: [],
  products: [],
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_LOCATION'; payload: Location }
  | { type: 'UPDATE_LOCATION'; payload: Location }
  | { type: 'DELETE_LOCATION'; payload: { id: string } }
  | { type: 'RESTOCK_LOCATION'; payload: { id: string; timestamp: string; machines: RestockMachineEntry[] } }
  | { type: 'EDIT_RESTOCK_ENTRY'; payload: { locationId: string; index: number; entry: RestockEntry } }
  | { type: 'DELETE_RESTOCK_ENTRY'; payload: { locationId: string; index: number } }
  | { type: 'ADD_MACHINE'; payload: { locationId: string; machine: Machine } }
  | { type: 'UPDATE_MACHINE'; payload: { locationId: string; machine: Machine } }
  | { type: 'DELETE_MACHINE'; payload: { locationId: string; machineId: string } }
  | { type: 'UPDATE_STOCK_COUNT'; payload: { locationId: string; machineId: string; productId: string; delta: number } }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: { id: string } };

// ---------------------------------------------------------------------------
// Reducer helpers
// ---------------------------------------------------------------------------

function latestTimestamp(history: RestockEntry[]): string | null {
  if (history.length === 0) return null;
  let max = history[0].timestamp;
  let maxMs = new Date(max).getTime();
  for (let i = 1; i < history.length; i++) {
    const t = history[i].timestamp;
    const ms = new Date(t).getTime();
    if (ms > maxMs) {
      max = t;
      maxMs = ms;
    }
  }
  return max;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_LOCATION':
      return { ...state, locations: [...state.locations, action.payload] };

    case 'UPDATE_LOCATION':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.id ? action.payload : l,
        ),
      };

    case 'DELETE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter((l) => l.id !== action.payload.id),
      };

    case 'RESTOCK_LOCATION': {
      const entry: RestockEntry = {
        timestamp: action.payload.timestamp,
        machines: action.payload.machines,
      };
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.id
            ? {
                ...l,
                lastRestockedAt: action.payload.timestamp,
                restockHistory: [...(l.restockHistory ?? []), entry],
                restockPeriodAnchorAt: undefined,
              }
            : l,
        ),
      };
    }

    case 'EDIT_RESTOCK_ENTRY':
      return {
        ...state,
        locations: state.locations.map((l) => {
          if (l.id !== action.payload.locationId) return l;
          const history = [...(l.restockHistory ?? [])];
          history[action.payload.index] = action.payload.entry;
          return {
            ...l,
            restockHistory: history,
            lastRestockedAt: latestTimestamp(history) ?? l.lastRestockedAt,
          };
        }),
      };

    case 'DELETE_RESTOCK_ENTRY':
      return {
        ...state,
        locations: state.locations.map((l) => {
          if (l.id !== action.payload.locationId) return l;
          const history = (l.restockHistory ?? []).filter(
            (_, i) => i !== action.payload.index,
          );
          return {
            ...l,
            restockHistory: history,
            lastRestockedAt: latestTimestamp(history),
          };
        }),
      };

    case 'ADD_MACHINE':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.locationId
            ? { ...l, machines: [...l.machines, action.payload.machine] }
            : l,
        ),
      };

    case 'UPDATE_MACHINE':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.locationId
            ? {
                ...l,
                machines: l.machines.map((m) =>
                  m.id === action.payload.machine.id ? action.payload.machine : m,
                ),
              }
            : l,
        ),
      };

    case 'DELETE_MACHINE':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.locationId
            ? {
                ...l,
                machines: l.machines.filter(
                  (m) => m.id !== action.payload.machineId,
                ),
              }
            : l,
        ),
      };

    case 'UPDATE_STOCK_COUNT': {
      const { locationId, machineId, productId, delta } = action.payload;
      return {
        ...state,
        locations: state.locations.map((l) => {
          if (l.id !== locationId) return l;
          return {
            ...l,
            machines: l.machines.map((m) => {
              if (m.id !== machineId) return m;
              const current = m.stockCounts[productId] ?? 0;
              const next = Math.max(0, current + delta);
              return {
                ...m,
                stockCounts: { ...m.stockCounts, [productId]: next },
              };
            }),
          };
        }),
      };
    }

    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload.id),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AppStateValue {
  state: AppState;
}

export interface AppActionsValue {
  replaceState: (next: AppState) => void;
  addLocation: (location: Omit<Location, 'id' | 'createdAt'>) => void;
  updateLocation: (location: Location) => void;
  deleteLocation: (id: string) => void;
  restockLocation: (id: string, machines?: RestockMachineEntry[]) => void;
  editRestockEntry: (
    locationId: string,
    index: number,
    entry: RestockEntry,
  ) => void;
  deleteRestockEntry: (locationId: string, index: number) => void;
  addMachine: (locationId: string, type: MachineType) => void;
  updateMachine: (locationId: string, machine: Machine) => void;
  deleteMachine: (locationId: string, machineId: string) => void;
  updateStockCount: (
    locationId: string,
    machineId: string,
    productId: string,
    delta: number,
  ) => void;
  addProduct: (
    name: string,
    emoji?: string,
    category?: ProductCategory,
    localImageUri?: string,
  ) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
}

export type AppContextValue = AppStateValue & AppActionsValue;

const AppStateContext = createContext<AppStateValue | null>(null);
const AppActionsContext = createContext<AppActionsValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hasHydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: AppState = JSON.parse(raw);
          const migrated: AppState = {
            ...parsed,
            locations: parsed.locations.map((l) => ({
              ...l,
              stockLevel: undefined,
              restockHistory: (() => {
                const h = l.restockHistory as unknown;
                if (Array.isArray(h) && h.length > 0) {
                  if (typeof h[0] === 'string') {
                    return (h as string[]).map((ts) => ({
                      timestamp: ts,
                      machines: [],
                    }));
                  }
                  return h as RestockEntry[];
                }
                return l.lastRestockedAt
                  ? [{ timestamp: l.lastRestockedAt, machines: [] }]
                  : [];
              })(),
              machines: l.machines.map((m) => ({
                ...m,
                stockLevel: undefined,
                stockCounts: m.stockCounts ?? {},
              })),
            })),
          };
          const cleanedProducts = migrated.products.map((p) => ({
            ...p,
            name: p.name.startsWith('Tubz ') ? p.name.slice(5) : p.name,
          }));
          const savedIds = new Set(cleanedProducts.map((p) => p.id));
          const newDefaults = DEFAULT_PRODUCTS.filter(
            (p) => !savedIds.has(p.id),
          );
          dispatch({
            type: 'LOAD_STATE',
            payload: {
              ...migrated,
              products: [...cleanedProducts, ...newDefaults],
            },
          });
        } catch {
          dispatch({
            type: 'LOAD_STATE',
            payload: { ...initialState, products: DEFAULT_PRODUCTS },
          });
        }
      } else {
        dispatch({
          type: 'LOAD_STATE',
          payload: { ...initialState, products: DEFAULT_PRODUCTS },
        });
      }
      hasHydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    rescheduleAllNotifications(state.locations).catch((e: unknown) => {
      appendLog({
        level: 'error',
        message: `rescheduleAllNotifications failed: ${e instanceof Error ? e.message : String(e)}`,
        stack: e instanceof Error ? e.stack : undefined,
      });
    });
  }, [state.locations]);

  const replaceState = useCallback(
    (next: AppState) => dispatch({ type: 'LOAD_STATE', payload: next }),
    [],
  );

  const addLocation = useCallback(
    (data: Omit<Location, 'id' | 'createdAt'>) => {
      const location: Location = {
        restockPeriodWeeks: 4,
        ...data,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_LOCATION', payload: location });
    },
    [],
  );

  const updateLocation = useCallback(
    (location: Location) =>
      dispatch({ type: 'UPDATE_LOCATION', payload: location }),
    [],
  );

  const deleteLocation = useCallback(
    (id: string) => dispatch({ type: 'DELETE_LOCATION', payload: { id } }),
    [],
  );

  const restockLocation = useCallback(
    (id: string, machines: RestockMachineEntry[] = []) =>
      dispatch({
        type: 'RESTOCK_LOCATION',
        payload: { id, timestamp: new Date().toISOString(), machines },
      }),
    [],
  );

  const editRestockEntry = useCallback(
    (locationId: string, index: number, entry: RestockEntry) =>
      dispatch({
        type: 'EDIT_RESTOCK_ENTRY',
        payload: { locationId, index, entry },
      }),
    [],
  );

  const deleteRestockEntry = useCallback(
    (locationId: string, index: number) =>
      dispatch({
        type: 'DELETE_RESTOCK_ENTRY',
        payload: { locationId, index },
      }),
    [],
  );

  const addMachine = useCallback((locationId: string, type: MachineType) => {
    const machine: Machine = {
      id: uid(),
      type,
      slots: Array(9).fill(null),
      stockCounts: {},
    };
    dispatch({ type: 'ADD_MACHINE', payload: { locationId, machine } });
  }, []);

  const updateMachine = useCallback(
    (locationId: string, machine: Machine) =>
      dispatch({ type: 'UPDATE_MACHINE', payload: { locationId, machine } }),
    [],
  );

  const deleteMachine = useCallback(
    (locationId: string, machineId: string) =>
      dispatch({
        type: 'DELETE_MACHINE',
        payload: { locationId, machineId },
      }),
    [],
  );

  const updateStockCount = useCallback(
    (locationId: string, machineId: string, productId: string, delta: number) =>
      dispatch({
        type: 'UPDATE_STOCK_COUNT',
        payload: { locationId, machineId, productId, delta },
      }),
    [],
  );

  const addProduct = useCallback(
    (
      name: string,
      emoji?: string,
      category?: ProductCategory,
      localImageUri?: string,
    ) => {
      const product: Product = {
        id: uid(),
        name,
        emoji,
        category,
        localImageUri,
      };
      dispatch({ type: 'ADD_PRODUCT', payload: product });
    },
    [],
  );

  const updateProduct = useCallback(
    (product: Product) =>
      dispatch({ type: 'UPDATE_PRODUCT', payload: product }),
    [],
  );

  const deleteProduct = useCallback(
    (id: string) => dispatch({ type: 'DELETE_PRODUCT', payload: { id } }),
    [],
  );

  // Actions are all useCallback-stable, so this memo value never changes once
  // mounted — giving action-only consumers re-render immunity to state churn.
  const actions = useMemo<AppActionsValue>(
    () => ({
      replaceState,
      addLocation,
      updateLocation,
      deleteLocation,
      restockLocation,
      editRestockEntry,
      deleteRestockEntry,
      addMachine,
      updateMachine,
      deleteMachine,
      updateStockCount,
      addProduct,
      updateProduct,
      deleteProduct,
    }),
    [
      replaceState,
      addLocation,
      updateLocation,
      deleteLocation,
      restockLocation,
      editRestockEntry,
      deleteRestockEntry,
      addMachine,
      updateMachine,
      deleteMachine,
      updateStockCount,
      addProduct,
      updateProduct,
      deleteProduct,
    ],
  );

  const stateValue = useMemo<AppStateValue>(() => ({ state }), [state]);

  return (
    <AppActionsContext.Provider value={actions}>
      <AppStateContext.Provider value={stateValue}>
        {children}
      </AppStateContext.Provider>
    </AppActionsContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useAppActions(): AppActionsValue {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error('useAppActions must be used within AppProvider');
  return ctx;
}

/**
 * Combined hook that returns both state and actions. Subscribes to state
 * changes; prefer `useAppActions` in components that only dispatch.
 */
export function useApp(): AppContextValue {
  const { state } = useAppState();
  const actions = useAppActions();
  return useMemo(() => ({ state, ...actions }), [state, actions]);
}
