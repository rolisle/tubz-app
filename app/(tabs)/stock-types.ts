import type { ProductCategory } from "@/types";

export type StockLevel = "full" | "half" | "empty";

export interface StockItem {
  productId: string;
  level: StockLevel;
  fullCount: number;
  halfCount: number;
}

export type StockState = Record<ProductCategory, StockItem[]>;

export const STORAGE_KEY = "@tubz_stock_v2";

export const EMPTY_STATE: StockState = { sweet: [], toy: [], other: [] };

export const SECTIONS: { key: ProductCategory; label: string; emoji: string }[] = [
  { key: "sweet", label: "Sweets", emoji: "🍬" },
  { key: "toy", label: "Toys", emoji: "🪀" },
];

export const LEVELS: { value: StockLevel; label: string; color: string }[] = [
  { value: "full", label: "Full box", color: "#22c55e" },
  { value: "half", label: "½ box", color: "#f59e0b" },
  { value: "empty", label: "Empty", color: "#ef4444" },
];
