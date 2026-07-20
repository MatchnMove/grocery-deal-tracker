import type { Store } from "@prisma/client";
import type { Unit } from "@/lib/units";

export type ProductSearchInput = {
  query: string;
  store: Store;
};

export type ProductSearchResult = {
  externalId?: string;
  name: string;
  brand?: string;
  packageQuantity: number;
  packageUnit: Unit;
  productUrl?: string;
  confidence: number;
};

export type ProductPriceInput = {
  externalId?: string;
  productUrl?: string;
  store: Store;
};

export type PriceResult = {
  normalPriceCents: number;
  loyaltyPriceCents?: number | null;
  requiresLoyaltyCard: boolean;
  specialStart?: Date | null;
  specialEnd?: Date | null;
  checkedAt: Date;
};

export interface PriceSourceAdapter {
  sourceName: string;
  supportsStore(store: Store): boolean;
  searchProducts(input: ProductSearchInput): Promise<ProductSearchResult[]>;
  fetchProductPrice(input: ProductPriceInput): Promise<PriceResult>;
}
