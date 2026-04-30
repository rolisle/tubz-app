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
}

export interface RestockMachineEntry {
  machineId: string;
  machineType: MachineType;
  products: RestockProduct[];
}

export interface RestockEntry {
  timestamp: string;
  machines: RestockMachineEntry[];
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
