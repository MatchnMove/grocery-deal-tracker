import Decimal from "decimal.js";
import { canConvert, packsNeeded, type Unit } from "./units";
import { minPrice } from "./money";

export type ProductCandidate = {
  id: string;
  name: string;
  aliases?: string[];
  categorySlug: string;
  packageQuantity: Decimal.Value;
  packageUnit: Unit;
  normalPriceCents: number;
  loyaltyPriceCents?: number | null;
  rejected?: boolean;
};

export type GroceryNeed = {
  id: string;
  name: string;
  categorySlug: string;
  requiredQuantity: Decimal.Value;
  requiredUnit: Unit;
  acceptableTerms?: string[];
  excludedTerms?: string[];
  rejectedProductIds?: string[];
};

function containsAny(value: string, terms: string[] = []) {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

export function isAcceptableMatch(need: GroceryNeed, product: ProductCandidate): boolean {
  if (product.rejected || need.rejectedProductIds?.includes(product.id)) return false;
  if (need.categorySlug !== product.categorySlug) return false;
  if (!canConvert(need.requiredUnit, product.packageUnit)) return false;
  const haystack = [product.name, ...(product.aliases ?? [])].join(" ");
  if (containsAny(haystack, need.excludedTerms)) return false;
  if (need.acceptableTerms?.length && !containsAny(haystack, need.acceptableTerms)) return false;
  return true;
}

export function rankProductForNeed(need: GroceryNeed, product: ProductCandidate) {
  if (!isAcceptableMatch(need, product)) return null;
  const pack = packsNeeded(need.requiredQuantity, need.requiredUnit, product.packageQuantity, product.packageUnit);
  const effective = minPrice(product.normalPriceCents, product.loyaltyPriceCents);
  const totalCostCents = effective.priceCents * pack.packs;
  const unitPriceCents = new Decimal(effective.priceCents)
    .div(product.packageQuantity)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  return {
    product,
    packsNeeded: pack.packs,
    leftoverQuantity: pack.leftoverQuantity,
    totalCostCents,
    unitPriceCents,
    usesLoyalty: effective.usesLoyalty
  };
}

export function chooseCheapestProduct(need: GroceryNeed, products: ProductCandidate[]) {
  return products
    .map((product) => rankProductForNeed(need, product))
    .filter((result): result is NonNullable<typeof result> => result != null)
    .sort((a, b) => a.totalCostCents - b.totalCostCents || a.packsNeeded - b.packsNeeded)[0];
}
