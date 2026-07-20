import { describe, expect, it } from "vitest";
import { categoryExclusions, productPrices } from "../lib/collector-parsing";

describe("collector retailer parsing", () => {
  it("uses the shelf price instead of Woolworths unit prices", () => {
    expect(productPrices("Wheatmeal 600g $0.36 / 100g $ 2 15 ($0.36)")).toEqual([215]);
    expect(productPrices("Mince $17.72 / 1kg $57.42 / ea (approx) $ 31 90 ($17.72)")).toEqual([3190]);
  });

  it("reads Foodstuffs split shelf prices", () => {
    expect(productPrices("NZ Beef Mince kg 21 99 kg $21.99/1kg Add")).toEqual([2199]);
    expect(productPrices("Hellers Beef Mince 340g 9 49 ea $27.91/1kg Add")).toEqual([949]);
  });

  it("keeps sale and regular prices but ignores the saving", () => {
    expect(productPrices("Eggs $ 12 55 Was $13.95 Save $1.40 ($0.70)")).toEqual([1255, 1395]);
  });

  it("rejects category lookalikes", () => {
    expect(categoryExclusions("Sardines")).toContain("cat food");
    expect(categoryExclusions("Ready-made roast chicken")).toContain("gravy");
    expect(categoryExclusions("Salami stick")).toContain("sliced");
  });
});
