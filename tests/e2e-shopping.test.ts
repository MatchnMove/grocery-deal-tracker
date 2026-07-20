import { describe, expect, it } from "vitest";
import { chooseCheapestProduct } from "../lib/matching";
import { recommendRoute } from "../lib/route-optimisation";

describe("end-to-end shopping recommendation happy path", () => {
  it("selects products and chooses the cheaper effective route", () => {
    const eggs = chooseCheapestProduct(
      { id: "eggs", name: "Eggs", categorySlug: "eggs", requiredQuantity: 42, requiredUnit: "EACH", acceptableTerms: ["egg"] },
      [{ id: "eggs-30", name: "Eggs 30 pack", categorySlug: "eggs", packageQuantity: 30, packageUnit: "EACH", normalPriceCents: 990 }]
    );
    expect(eggs?.totalCostCents).toBe(1980);
    const route = recommendRoute({
      oneStoreOptions: [{ storeId: "ww", storeName: "Woolworths", oneWayDistanceKm: 3, itemCostCents: 10000, items: ["all"] }],
      multiStoreOption: [
        { storeId: "ww", storeName: "Woolworths", oneWayDistanceKm: 3, itemCostCents: 4000, items: ["roast chicken"] },
        { storeId: "ps", storeName: "PAK'nSAVE", oneWayDistanceKm: 4, itemCostCents: 4000, items: ["eggs", "meat"] }
      ],
      fuelEconomyLitresPer100Km: 7.5,
      fuelPriceCentsPerLitre: 270,
      minimumSavingExtraStopCents: 500
    });
    expect(route.recommendedStops).toBe(2);
    expect(route.totalCents).toBeLessThan(10000);
  });
});
