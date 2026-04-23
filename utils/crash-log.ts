/**
 * In-app crash / error log.
 *
 * Captures:
 *  - Fatal and non-fatal JS errors via ErrorUtils (React Native global handler)
 *  - console.error() calls (React render errors, promise rejections that reach
 *    the console, notification scheduling failures, etc.)
 *
 * Entries are persisted to AsyncStorage so they survive app restarts.
 * The test menu (🧪) can read and display them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tubz:crashLog';
const MAX_ENTRIES = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = 'fatal' | 'error' | 'warn';

export interface CrashEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  stack?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function argsToMessage(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    })
    .join(' ')
    .trim();
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function appendLog(
  entry: Omit<CrashEntry, 'id' | 'timestamp'>,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: CrashEntry[] = raw ? JSON.parse(raw) : [];
    const next: CrashEntry[] = [
      { ...entry, id: makeId(), timestamp: new Date().toISOString() },
      ...existing,
    ].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Swallow — we must not throw inside the error handler
  }
}

/**
 * Write a lightweight breadcrumb (non-error) to the log.
 * Useful for tracing "last known good point" before a native crash.
 */
export function breadcrumb(message: string): void {
  appendLog({ level: 'warn', message: `[breadcrumb] ${message}` });
}

export async function getLogs(): Promise<CrashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CrashEntry[]) : [];
  } catch {
    return [];
  }
}

export async function clearLogs(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

// ─── Global handler installation ──────────────────────────────────────────────

let _installed = false;

/**
 * Install global error interceptors. Safe to call multiple times — only
 * installs once. Call this as early as possible (e.g. in _layout.tsx useEffect).
 */
export function installGlobalHandlers(): void {
  if (_installed) return;
  _installed = true;

  // 1. React Native global JS error handler (catches fatal + unhandled errors)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EU = (global as any).ErrorUtils;
  if (EU?.setGlobalHandler) {
    const originalHandler = EU.getGlobalHandler?.() as
      | ((error: Error, isFatal: boolean) => void)
      | undefined;

    EU.setGlobalHandler((error: Error, isFatal: boolean) => {
      appendLog({
        level: isFatal ? 'fatal' : 'error',
        message: error?.message ?? String(error),
        stack: error?.stack,
      });
      // Always call the original so the default RN behaviour is preserved
      originalHandler?.(error, isFatal);
    });
  }

  // 2. console.error interception — catches React render errors, failed
  //    async calls that log to the console, etc.
  const origError = console.error.bind(console);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    appendLog({ level: 'error', message: argsToMessage(args) });
    origError(...args);
  };

  // 3. console.warn — optional; enable if you want to see RN/Expo warnings too
  // const origWarn = console.warn.bind(console);
  // console.warn = (...args: any[]) => {
  //   appendLog({ level: 'warn', message: argsToMessage(args) });
  //   origWarn(...args);
  // };
}
