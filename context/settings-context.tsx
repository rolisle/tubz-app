import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = '@tubz_settings_v1';

/* ─── Color type ──────────────────────────────────────────────── */

/** Single hex string = solid colour. Two or more = gradient stops (left→right). */
export type AppColor = string[];

/** Returns the primary (first) colour — safe for text / border usage. */
export function primaryColor(c: AppColor): string {
  return c[0];
}

/** True if two AppColors represent the same value. */
export function colorEquals(a: AppColor, b: AppColor): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ─── Preset palettes ─────────────────────────────────────────── */

export const ACCENT_PRESETS: { label: string; value: AppColor }[] = [
  { label: 'Sky',    value: ['#38bdf8'] },
  { label: 'Blue',   value: ['#3b82f6'] },
  { label: 'Indigo', value: ['#6366f1'] },
  { label: 'Purple', value: ['#a855f7'] },
  { label: 'Pink',   value: ['#ec4899'] },
  { label: 'Red',    value: ['#ef4444'] },
  { label: 'Orange', value: ['#f97316'] },
  { label: 'Amber',  value: ['#f59e0b'] },
  { label: 'Green',  value: ['#22c55e'] },
  { label: 'Teal',   value: ['#14b8a6'] },
  // ─── Gradients ───
  { label: 'Sunset', value: ['#f97316', '#ec4899'] },
  { label: 'Ocean',  value: ['#3b82f6', '#06b6d4'] },
  { label: 'Aurora', value: ['#8b5cf6', '#22d3ee'] },
];

export const SWEET_PRESETS: { label: string; value: AppColor }[] = [
  { label: 'Pink',   value: ['#f472b6'] },
  { label: 'Rose',   value: ['#fb7185'] },
  { label: 'Red',    value: ['#ef4444'] },
  { label: 'Orange', value: ['#f97316'] },
  { label: 'Amber',  value: ['#f59e0b'] },
  { label: 'Yellow', value: ['#eab308'] },
  { label: 'Lime',   value: ['#84cc16'] },
  { label: 'Green',  value: ['#22c55e'] },
  // ─── Gradients ───
  { label: 'Candy',    value: ['#f472b6', '#fb923c'] },
  { label: 'Berry',    value: ['#ec4899', '#a855f7'] },
  { label: 'Tropical', value: ['#fbbf24', '#f472b6'] },
];

export const TOY_PRESETS: { label: string; value: AppColor }[] = [
  { label: 'Sky',    value: ['#38bdf8'] },
  { label: 'Blue',   value: ['#60a5fa'] },
  { label: 'Indigo', value: ['#818cf8'] },
  { label: 'Purple', value: ['#c084fc'] },
  { label: 'Teal',   value: ['#2dd4bf'] },
  { label: 'Cyan',   value: ['#22d3ee'] },
  { label: 'Green',  value: ['#4ade80'] },
  { label: 'Orange', value: ['#fb923c'] },
  // ─── Gradients ───
  { label: 'Galaxy', value: ['#6366f1', '#38bdf8'] },
  { label: 'Forest', value: ['#22c55e', '#14b8a6'] },
  { label: 'Neon',   value: ['#a855f7', '#60a5fa'] },
];

/* ─── Types ───────────────────────────────────────────────────── */

export interface AppSettings {
  accentColor: AppColor;
  sweetColor:  AppColor;
  toyColor:    AppColor;
}

const DEFAULTS: AppSettings = {
  accentColor: ['#38bdf8'],
  sweetColor:  ['#f472b6'],
  toyColor:    ['#60a5fa'],
};

function migrateColor(raw: unknown, fallback: AppColor): AppColor {
  if (Array.isArray(raw) && raw.length > 0) return raw as AppColor;
  if (typeof raw === 'string' && raw.startsWith('#')) return [raw];
  return fallback;
}

interface SettingsContextValue {
  settings: AppSettings;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  setSetting: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          setSettings({
            accentColor: migrateColor(parsed.accentColor, DEFAULTS.accentColor),
            sweetColor:  migrateColor(parsed.sweetColor,  DEFAULTS.sweetColor),
            toyColor:    migrateColor(parsed.toyColor,    DEFAULTS.toyColor),
          });
        } catch { /* ignore */ }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  const setSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <SettingsContext.Provider value={{ settings, setSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
