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
