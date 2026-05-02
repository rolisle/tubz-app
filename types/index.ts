export type MachineType = "sweet" | "toy";

export type ProductCategory = "sweet" | "toy" | "other";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  open: string;
  close: string;
}

/** Keyed by WeekDay; missing key = closed that day */
export type OpeningHours = Partial<Record<WeekDay, DayHours>>;

export interface Product {
  id: string;
  name: string;
  emoji?: string;
  category?: ProductCategory;
  localImageUri?: string;
}

export interface Machine {
  id: string;
  type: MachineType;
  slots: (string | null)[];
  stockCounts: Record<string, number>;
}

export interface RestockProduct {
  productId: string;
  qty: number;
  /**
   * When set, this line is stock for a product that took a slot from the named
   * SKU (shown separately from primary lines; excluded from top-selling for this productId).
   */
  replacesProductId?: string;
}

/** In-session replacement row (not persisted; serialized to RestockProduct with replacesProductId). */
export interface RestockSessionReplacementLine {
  id: string;
  productId: string;
  replacesProductId: string;
  qty: number;
  done: boolean;
}

export interface RestockMachineEntry {
  machineId: string;
  machineType: MachineType;
  products: RestockProduct[];
}

/** Logged when a slot’s product is changed during a restock session (before Done). */
export interface RestockProductReplacement {
  machineId: string;
  /** Product removed from one slot (missing/restock qty below was what you had entered for it). */
  replacedProductId: string;
  /** Product now in that slot. */
  replacedWithProductId: string;
  /** Missing/restock quantity recorded for replacedProductId at the moment of the swap. */
  missingQtyRecorded: number;
}

export interface RestockEntry {
  timestamp: string;
  machines: RestockMachineEntry[];
  /** Planogram swaps during this session, with missing-qty snapshot for the replaced product. */
  productReplacements?: RestockProductReplacement[];
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  notes?: string;
  lastRestockedAt: string | null;
  /** Array of restock sessions; older format (string[]) is migrated on load */
  restockHistory?: RestockEntry[];
  restockPeriodWeeks?: number;
  /**
   * When `restockPeriodWeeks === 1`, optional anchor for “remind me in 1 week” — due date is
   * anchor + 7 days. Cleared after a restock. Older data without this uses lastRestockedAt/createdAt.
   */
  restockPeriodAnchorAt?: string;
  openingHours?: OpeningHours;
  machines: Machine[];
  createdAt: string;
}

export interface AppState {
  locations: Location[];
  products: Product[];
}
