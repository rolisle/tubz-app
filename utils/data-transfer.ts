/**
 * Native implementation of export/import using expo-file-system,
 * expo-sharing, and expo-document-picker.
 *
 * The .web.ts version provides web-specific implementations.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { AppState } from '../types';

export interface TubzExport {
  version: 1;
  exportedAt: string;
  locations: AppState['locations'];
  products: AppState['products'];
}

/** Serialise state to JSON, write to cache, share via OS sheet. */
export async function exportData(state: AppState): Promise<void> {
  const payload: TubzExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    locations: state.locations,
    products: state.products,
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `tubz-export-${new Date().toISOString().slice(0, 10)}.json`;
  const uri = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Tubz data' });
  }
}

/**
 * Let the user pick a .json file, parse it, and return the validated payload.
 * Throws a user-readable string on failure.
 */
export async function importData(): Promise<TubzExport> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Cancelled');
  }

  const uri = result.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseExport(raw);
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
