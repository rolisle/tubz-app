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

/** Opens a file picker, reads the chosen JSON, and returns the parsed payload.
 *
 * We intentionally do NOT use a focus-return fallback to detect cancellation —
 * it can race `onchange` on slow devices or large files and falsely reject a
 * valid import. Browsers without native `oncancel` support will simply leave
 * the Promise pending if the user dismisses the dialog without picking a file,
 * which is harmless (it resolves the next time the user imports). */
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
      try {
        const text = await file.text();
        settle(() => resolve(parseExport(text)));
      } catch (e) {
        settle(() => reject(e));
      }
    };

    input.oncancel = () => settle(() => reject(new Error('Cancelled')));

    input.click();
  });
}
