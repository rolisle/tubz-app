import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { DEFAULT_PRODUCTS } from '@/constants/default-products';
import type { AppState, Location, Machine, MachineType, Product, ProductCategory } from '@/types';
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
  | { type: 'RESTOCK_LOCATION'; payload: { id: string; timestamp: string } }
  | { type: 'ADD_MACHINE'; payload: { locationId: string; machine: Machine } }
  | { type: 'UPDATE_MACHINE'; payload: { locationId: string; machine: Machine } }
  | { type: 'DELETE_MACHINE'; payload: { locationId: string; machineId: string } }
  | { type: 'UPDATE_STOCK_COUNT'; payload: { locationId: string; machineId: string; productId: string; delta: number } }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: { id: string } };

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
          l.id === action.payload.id ? action.payload : l
        ),
      };

    case 'DELETE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter((l) => l.id !== action.payload.id),
      };

    case 'RESTOCK_LOCATION':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.id
            ? {
                ...l,
                lastRestockedAt: action.payload.timestamp,
                restockHistory: [...(l.restockHistory ?? []), action.payload.timestamp],
              }
            : l
        ),
      };

    case 'ADD_MACHINE':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.locationId
            ? { ...l, machines: [...l.machines, action.payload.machine] }
            : l
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
                  m.id === action.payload.machine.id ? action.payload.machine : m
                ),
              }
            : l
        ),
      };

    case 'DELETE_MACHINE':
      return {
        ...state,
        locations: state.locations.map((l) =>
          l.id === action.payload.locationId
            ? {
                ...l,
                machines: l.machines.filter((m) => m.id !== action.payload.machineId),
              }
            : l
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
          p.id === action.payload.id ? action.payload : p
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

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addLocation: (location: Omit<Location, 'id' | 'createdAt'>) => void;
  updateLocation: (location: Location) => void;
  deleteLocation: (id: string) => void;
  restockLocation: (id: string) => void;
  addMachine: (locationId: string, type: MachineType) => void;
  updateMachine: (locationId: string, machine: Machine) => void;
  deleteMachine: (locationId: string, machineId: string) => void;
  updateStockCount: (locationId: string, machineId: string, productId: string, delta: number) => void;
  addProduct: (name: string, emoji?: string, category?: ProductCategory, localImageUri?: string) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted state on mount; seed default products on first run
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: AppState = JSON.parse(raw);
          // Ensure all machines have stockCounts (migration for older data)
          const migrated: AppState = {
            ...parsed,
            locations: parsed.locations.map((l) => ({
              ...l,
              stockLevel: undefined,
              // Seed restockHistory from lastRestockedAt if it doesn't exist yet
              restockHistory:
                l.restockHistory ??
                (l.lastRestockedAt ? [l.lastRestockedAt] : []),
              machines: l.machines.map((m) => ({
                ...m,
                stockLevel: undefined,
                stockCounts: m.stockCounts ?? {},
              })),
            })),
          };
          // Strip legacy "Tubz " prefix from product names
          const cleanedProducts = migrated.products.map((p) => ({
            ...p,
            name: p.name.startsWith('Tubz ') ? p.name.slice(5) : p.name,
          }));
          // Merge any new default products not already in saved catalog
          const savedIds = new Set(cleanedProducts.map((p) => p.id));
          const newDefaults = DEFAULT_PRODUCTS.filter((p) => !savedIds.has(p.id));
          dispatch({
            type: 'LOAD_STATE',
            payload: {
              ...migrated,
              products: [...cleanedProducts, ...newDefaults],
            },
          });
        } catch {
          dispatch({ type: 'LOAD_STATE', payload: { ...initialState, products: DEFAULT_PRODUCTS } });
        }
      } else {
        dispatch({ type: 'LOAD_STATE', payload: { ...initialState, products: DEFAULT_PRODUCTS } });
      }
    });
  }, []);

  // Persist on every state change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Keep scheduled notifications in sync with location restock periods
  useEffect(() => {
    rescheduleAllNotifications(state.locations);
  }, [state.locations]);

  // ---------------------------------------------------------------------------
  // Convenience helpers
  // ---------------------------------------------------------------------------

  const addLocation = (data: Omit<Location, 'id' | 'createdAt'>) => {
    const location: Location = {
      restockPeriodWeeks: 4,
      ...data,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOCATION', payload: location });
  };

  const updateLocation = (location: Location) =>
    dispatch({ type: 'UPDATE_LOCATION', payload: location });

  const deleteLocation = (id: string) =>
    dispatch({ type: 'DELETE_LOCATION', payload: { id } });

  const restockLocation = (id: string) =>
    dispatch({ type: 'RESTOCK_LOCATION', payload: { id, timestamp: new Date().toISOString() } });

  const addMachine = (locationId: string, type: MachineType) => {
    const machine: Machine = {
      id: uid(),
      type,
      slots: Array(9).fill(null),
      stockCounts: {},
    };
    dispatch({ type: 'ADD_MACHINE', payload: { locationId, machine } });
  };

  const updateMachine = (locationId: string, machine: Machine) =>
    dispatch({ type: 'UPDATE_MACHINE', payload: { locationId, machine } });

  const deleteMachine = (locationId: string, machineId: string) =>
    dispatch({ type: 'DELETE_MACHINE', payload: { locationId, machineId } });

  const updateStockCount = (locationId: string, machineId: string, productId: string, delta: number) =>
    dispatch({ type: 'UPDATE_STOCK_COUNT', payload: { locationId, machineId, productId, delta } });

  const addProduct = (name: string, emoji?: string, category?: ProductCategory, localImageUri?: string) => {
    const product: Product = { id: uid(), name, emoji, category, localImageUri };
    dispatch({ type: 'ADD_PRODUCT', payload: product });
  };

  const updateProduct = (product: Product) =>
    dispatch({ type: 'UPDATE_PRODUCT', payload: product });

  const deleteProduct = (id: string) =>
    dispatch({ type: 'DELETE_PRODUCT', payload: { id } });

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addLocation,
        updateLocation,
        deleteLocation,
        restockLocation,
        addMachine,
        updateMachine,
        deleteMachine,
        updateStockCount,
        addProduct,
        updateProduct,
        deleteProduct,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
