/**
 * Web implementation of export/import — no native modules needed.
 */
import type { AppState } from '../types';
import { parseExport } from './parse-export';

export type { TubzExport } from './parse-export';
export { parseExport } from './parse-export';

import type { TubzExport } from './parse-export';

/** Triggers a JSON file download in the browser. */
export async function exportData(state: AppState): Promise<void> {
  const payload: TubzExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    locations: state.locations,
    products: state.products,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tubz-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Opens a file picker, reads the chosen JSON, and returns the parsed payload. */
export async function importData(): Promise<TubzExport> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { settle(() => reject(new Error('Cancelled'))); return; }
      const text = await file.text();
      try {
        settle(() => resolve(parseExport(text)));
      } catch (e) {
        settle(() => reject(e));
      }
    };

    // oncancel is spec'd but not universally supported; use focus-return as fallback
    input.oncancel = () => settle(() => reject(new Error('Cancelled')));

    // When the browser returns focus to the window after the picker closes without
    // a selection, resolve as cancelled after a short delay
    const onWindowFocus = () => {
      setTimeout(() => settle(() => reject(new Error('Cancelled'))), 300);
      window.removeEventListener('focus', onWindowFocus);
    };
    window.addEventListener('focus', onWindowFocus);

    input.click();
  });
}
