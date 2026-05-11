import type { MachineType } from "@/types";

export const DEFAULT_SWEET_STOCK_LEVEL = 9;
export const DEFAULT_TOY_STOCK_LEVEL = 12;

const MIN_LEVEL = 1;
const MAX_LEVEL = 99;

export interface StockLevelSettings {
  sweetStockLevel: number;
  toyStockLevel: number;
}

/** Normalise a stored or parsed value for one machine type’s per-slot capacity. */
export function clampStockLevel(raw: unknown, fallback: number): number {
  const n =
    typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.floor(n)));
}

export function slotCapacityForMachineType(
  type: MachineType,
  levels: StockLevelSettings,
): number {
  const raw =
    type === "toy" ? levels.toyStockLevel : levels.sweetStockLevel;
  const fallback =
    type === "toy" ? DEFAULT_TOY_STOCK_LEVEL : DEFAULT_SWEET_STOCK_LEVEL;
  return clampStockLevel(raw, fallback);
}
