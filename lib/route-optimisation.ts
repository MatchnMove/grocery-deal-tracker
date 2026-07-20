import Decimal from "decimal.js";

export type StoreChoice = {
  storeId: string;
  storeName: string;
  oneWayDistanceKm: Decimal.Value;
  itemCostCents: number;
  items: string[];
};

export function fuelCostCents(distanceKm: Decimal.Value, litresPer100Km: Decimal.Value, fuelPriceCentsPerLitre: number) {
  return new Decimal(distanceKm)
    .div(100)
    .mul(litresPer100Km)
    .mul(fuelPriceCentsPerLitre)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function returnFuelCostCents(oneWayDistanceKm: Decimal.Value, litresPer100Km: Decimal.Value, fuelPriceCentsPerLitre: number) {
  return fuelCostCents(new Decimal(oneWayDistanceKm).mul(2), litresPer100Km, fuelPriceCentsPerLitre);
}

export type RouteRecommendationInput = {
  oneStoreOptions: StoreChoice[];
  multiStoreOption: StoreChoice[];
  fuelEconomyLitresPer100Km: Decimal.Value;
  fuelPriceCentsPerLitre: number;
  minimumSavingExtraStopCents: number;
};

export function recommendRoute(input: RouteRecommendationInput) {
  const costFor = (stores: StoreChoice[]) => {
    const groceryCents = stores.reduce((sum, store) => sum + store.itemCostCents, 0);
    const fuelCents = stores.reduce(
      (sum, store) => sum + returnFuelCostCents(store.oneWayDistanceKm, input.fuelEconomyLitresPer100Km, input.fuelPriceCentsPerLitre),
      0
    );
    return { groceryCents, fuelCents, totalCents: groceryCents + fuelCents };
  };
  const singleOptions = input.oneStoreOptions
    .map((store) => ({ stores: [store], ...costFor([store]) }))
    .sort((a, b) => a.totalCents - b.totalCents);
  const bestSingle = singleOptions[0];
  const multi = { stores: input.multiStoreOption, ...costFor(input.multiStoreOption) };
  const saving = bestSingle.totalCents - multi.totalCents;
  if (input.multiStoreOption.length > 1 && saving >= input.minimumSavingExtraStopCents) {
    return { ...multi, comparedWithOneStoreSavingCents: saving, recommendedStops: input.multiStoreOption.length };
  }
  return { ...bestSingle, comparedWithOneStoreSavingCents: 0, recommendedStops: 1 };
}
