import Decimal from "decimal.js";

export function centsToDollars(cents: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD"
  }).format(cents / 100);
}

export function dollarsToCents(value: string | number): number {
  const decimal = new Decimal(value);
  if (decimal.isNegative() || !decimal.isFinite()) {
    throw new Error("Price must be a positive number");
  }
  return decimal.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function multiplyCents(cents: number, quantity: number | Decimal): number {
  return new Decimal(cents).mul(quantity).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function divideCents(cents: number, quantity: number | Decimal): number {
  const amount = new Decimal(quantity);
  if (amount.lte(0)) throw new Error("Quantity must be greater than zero");
  return new Decimal(cents).div(amount).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function minPrice(normalPriceCents: number, loyaltyPriceCents?: number | null) {
  if (loyaltyPriceCents != null && loyaltyPriceCents > 0 && loyaltyPriceCents < normalPriceCents) {
    return { priceCents: loyaltyPriceCents, usesLoyalty: true };
  }
  return { priceCents: normalPriceCents, usesLoyalty: false };
}
