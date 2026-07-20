export const STALE_PRICE_DAYS = 14;

export function isPriceStale(checkedAt: Date, now = new Date()): boolean {
  const ageMs = now.getTime() - checkedAt.getTime();
  return ageMs > STALE_PRICE_DAYS * 24 * 60 * 60 * 1000;
}
