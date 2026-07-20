import { describe, expect, it } from "vitest";
import { chooseCheapestProduct, isAcceptableMatch } from "../lib/matching";

describe("product matching", () => {
  it("compares egg pack sizes by total purchase cost", () => {
    const need = { id: "eggs", name: "Eggs", categorySlug: "eggs", requiredQuantity: 42, requiredUnit: "EACH" as const, acceptableTerms: ["egg"] };
    const result = chooseCheapestProduct(need, [
      { id: "18", name: "Eggs 18 pack", categorySlug: "eggs", packageQuantity: 18, packageUnit: "EACH", normalPriceCents: 690 },
      { id: "30", name: "Eggs 30 pack", categorySlug: "eggs", packageQuantity: 30, packageUnit: "EACH", normalPriceCents: 990 }
    ]);
    expect(result?.product.id).toBe("30");
    expect(result?.packsNeeded).toBe(2);
  });

  it("rejects excluded substitutions", () => {
    const need = { id: "bread", name: "Brown bread", categorySlug: "bread", requiredQuantity: 1, requiredUnit: "LOAF" as const, acceptableTerms: ["brown"], excludedTerms: ["white"] };
    expect(isAcceptableMatch(need, { id: "white", name: "Budget white bread", categorySlug: "bread", packageQuantity: 1, packageUnit: "LOAF", normalPriceCents: 180 })).toBe(false);
  });
});
