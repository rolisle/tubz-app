import type { ProductCategory } from "@/types";

export type StockLevel = "full" | "half" | "empty";

export interface StockItem {
  productId: string;
  level: StockLevel;
  fullCount: number;
  halfCount: number;
}

/** Only the categories surfaced in the Stock tab are tracked.
 *  `ProductCategory` also includes "other" but it has no corresponding
 *  section; intentionally narrowed here so typed lookups cannot reach a
 *  bucket that has no UI. */
export type StockCategory = Exclude<ProductCategory, "other">;

export type StockState = Record<StockCategory, StockItem[]>;

export const STORAGE_KEY = "@tubz_stock_v2";

export const EMPTY_STATE: StockState = { sweet: [], toy: [] };

export const SECTIONS: { key: StockCategory; label: string; emoji: string }[] = [
  { key: "sweet", label: "Sweets", emoji: "🍬" },
  { key: "toy", label: "Toys", emoji: "🪀" },
];

export const LEVELS: { value: StockLevel; label: string; color: string }[] = [
  { value: "full", label: "Full box", color: "#22c55e" },
  { value: "half", label: "½ box", color: "#f59e0b" },
  { value: "empty", label: "Empty", color: "#ef4444" },
];
