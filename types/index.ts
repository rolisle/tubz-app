export type StockLevel = 'full' | 'half' | 'none';
export type MachineType = 'sweet' | 'toy';

export type ProductCategory = 'sweet' | 'toy' | 'other';

export interface Product {
  id: string;
  name: string;
  emoji?: string;
  imageUrl?: string;
  category?: ProductCategory;
}

export interface Machine {
  id: string;
  type: MachineType;
  stockLevel: StockLevel;
  /** Up to 9 slots; each entry is a product ID or null (empty slot) */
  slots: (string | null)[];
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  /** Overall supply stock at the location */
  stockLevel: StockLevel;
  lastRestockedAt: string | null;
  machines: Machine[];
  createdAt: string;
}

export interface AppState {
  locations: Location[];
  products: Product[];
}
