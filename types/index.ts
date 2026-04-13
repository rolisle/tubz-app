export type MachineType = 'sweet' | 'toy';

export type ProductCategory = 'sweet' | 'toy' | 'other';

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
  /** Up to 9 slots; each entry is a product ID or null (empty slot) */
  slots: (string | null)[];
  /** Supply stock count per product ID — how many of each item are available to reload */
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
  machines: Machine[];
  createdAt: string;
}

export interface AppState {
  locations: Location[];
  products: Product[];
}
