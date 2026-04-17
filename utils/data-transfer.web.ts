/**
 * Web implementation of export/import — no native modules needed.
 */
import type { AppState } from '../types';

export interface TubzExport {
  version: 1;
  exportedAt: string;
  locations: AppState['locations'];
  products: AppState['products'];
}

export function parseExport(raw: string): TubzExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (
    typeof parsed !== 'object' || parsed === null ||
    (parsed as TubzExport).version !== 1 ||
    !Array.isArray((parsed as TubzExport).locations) ||
    !Array.isArray((parsed as TubzExport).products)
  ) {
    throw new Error('The file does not look like a Tubz export.');
  }
  return parsed as TubzExport;
}

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

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('Cancelled')); return; }

      const text = await file.text();
      try {
        resolve(parseExport(text));
      } catch (e) {
        reject(e);
      }
    };

    input.oncancel = () => reject(new Error('Cancelled'));
    input.click();
  });
}
