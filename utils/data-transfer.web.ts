/**
 * Web implementation of export/import — no native modules needed.
 */
import type { AppState } from "../types";
import { parseTubzCsv, tubzExportToCsv } from "./data-transfer-csv";
import { MAX_IMPORT_BYTES, parseExport, type TubzExport } from "./parse-export";

export { parseExport } from "./parse-export";
export type { TubzExport } from "./parse-export";

export type ExportFormat = "json" | "csv";

function buildPayload(state: AppState): TubzExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    locations: state.locations,
    products: state.products,
  };
}

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

/** Triggers a file download in the browser. */
export async function exportData(
  state: AppState,
  format: ExportFormat = "json",
): Promise<void> {
  const payload = buildPayload(state);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const isCsv = format === "csv";
  const body = isCsv
    ? tubzExportToCsv(payload)
    : JSON.stringify(payload, null, 2);
  const mime = isCsv ? "text/csv;charset=utf-8" : "application/json";
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = isCsv
    ? `tubz-export-${dateStamp}.csv`
    : `tubz-export-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export async function importData(): Promise<TubzExport> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json,text/csv,.csv";
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        settle(() => reject(new Error("Cancelled")));
        return;
      }
      try {
        const text = await file.text();
        const payload = parseImportedPayload(text);
        settle(() => resolve(payload));
      } catch (e) {
        settle(() => reject(e));
      }
    };

    input.oncancel = () => settle(() => reject(new Error("Cancelled")));

    input.click();
  });
}
