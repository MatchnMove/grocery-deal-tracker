import { describe, expect, it } from "vitest";
import { fuelCostCents, recommendRoute } from "../lib/route-optimisation";

describe("route optimisation", () => {
  it("calculates return fuel cost from distance, economy and fuel price", () => {
    expect(fuelCostCents(20, 7.5, 270)).toBe(405);
  });

  it("does not add another supermarket unless the saving clears the configured minimum", () => {
    const route = recommendRoute({
      oneStoreOptions: [{ storeId: "a", storeName: "A", oneWayDistanceKm: 2, itemCostCents: 9000, items: ["all"] }],
      multiStoreOption: [
        { storeId: "a", storeName: "A", oneWayDistanceKm: 2, itemCostCents: 5000, items: ["eggs"] },
        { storeId: "b", storeName: "B", oneWayDistanceKm: 5, itemCostCents: 3800, items: ["meat"] }
      ],
      fuelEconomyLitresPer100Km: 7.5,
      fuelPriceCentsPerLitre: 270,
      minimumSavingExtraStopCents: 500
    });
    expect(route.recommendedStops).toBe(1);
  });
});
