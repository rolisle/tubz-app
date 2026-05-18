/**
 * Native implementation of export/import using expo-file-system (v19 new API),
 * expo-sharing, and expo-document-picker.
 *
 * expo-file-system v19 (SDK 54) deprecated the legacy API. We use the new
 * File/Paths class API here; the legacy entry-point is no longer used.
 *
 * The .web.ts version provides web-specific implementations.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { AppState } from '../types';
import { tubzExportToCsv, parseTubzCsv } from './data-transfer-csv';
import { parseExport, type TubzExport, MAX_IMPORT_BYTES } from './parse-export';

export type { TubzExport } from './parse-export';
export { parseExport } from './parse-export';

export type ExportFormat = 'json' | 'csv';

function buildPayload(state: AppState): TubzExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    locations: state.locations,
    products: state.products,
  };
}

/** JSON or Tubz CSV (auto-detected). Rejects files over MAX_IMPORT_BYTES. */
export function parseImportedPayload(raw: string): TubzExport {
  if (raw.length > MAX_IMPORT_BYTES) {
    throw new Error("Import file is too large (max 10 MB).");
  }
  const text = raw.replace(/^\uFEFF/, "");
  const t = text.trimStart();
  if (t.startsWith("{")) {
    return parseExport(text);
  }
  return parseTubzCsv(text);
}

/** Serialise state, write to cache, share via OS sheet. */
export async function exportData(
  state: AppState,
  format: ExportFormat = 'json',
): Promise<void> {
  const payload = buildPayload(state);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const isCsv = format === 'csv';
  const body = isCsv ? tubzExportToCsv(payload) : JSON.stringify(payload, null, 2);
  const filename = isCsv
    ? `tubz-export-${dateStamp}.csv`
    : `tubz-export-${dateStamp}.json`;
  const file = new File(Paths.cache, filename);
  file.write(body);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: isCsv ? 'text/csv' : 'application/json',
    dialogTitle: 'Export Tubz data',
  });
}

/**
 * Let the user pick a .json or Tubz .csv file, parse it, and return the validated payload.
 * Throws a user-readable string on failure.
 */
export async function importData(): Promise<TubzExport> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/json',
      'text/comma-separated-values',
      'text/csv',
      'application/csv',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Cancelled');
  }

  const file = new File(result.assets[0].uri);
  const raw = await file.text();
  return parseImportedPayload(raw);
}
