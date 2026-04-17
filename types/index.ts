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

export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  notes?: string;
  lastRestockedAt: string | null;
  restockHistory?: string[];
  restockPeriodWeeks?: number;
  openingHours?: OpeningHours;
  machines: Machine[];
  createdAt: string;
}

export interface AppState {
  locations: Location[];
  products: Product[];
}
