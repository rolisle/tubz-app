import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@tubz_data_transfer_meta_v1";

export type DataTransferMeta = {
  lastExportAt?: string;
  lastImportAt?: string;
};

export async function loadDataTransferMeta(): Promise<DataTransferMeta> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const o = parsed as Record<string, unknown>;
    return {
      ...(typeof o.lastExportAt === "string" ? { lastExportAt: o.lastExportAt } : {}),
      ...(typeof o.lastImportAt === "string" ? { lastImportAt: o.lastImportAt } : {}),
    };
  } catch {
    return {};
  }
}

export async function patchDataTransferMeta(
  patch: Partial<DataTransferMeta>,
): Promise<void> {
  const prev = await loadDataTransferMeta();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...prev, ...patch }),
  );
}

/** Human-readable date/time for settings labels (en-GB). */
export function formatDataTransferStamp(iso: string | undefined): string {
  if (!iso?.trim()) return "Never";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Never";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Never";
  }
}
