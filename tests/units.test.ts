import { describe, expect, it } from "vitest";
import { convertQuantity, packsNeeded } from "../lib/units";
import { dollarsToCents, minPrice } from "../lib/money";

describe("unit and money calculations", () => {
  it("converts grams and kilograms safely", () => {
    expect(convertQuantity(500, "GRAM", "KILOGRAM").toString()).toBe("0.5");
    expect(convertQuantity(1.25, "KILOGRAM", "GRAM").toString()).toBe("1250");
  });

  it("calculates packs and leftover quantity", () => {
    const result = packsNeeded(42, "EACH", 18, "EACH");
    expect(result.packs).toBe(3);
    expect(result.leftoverQuantity.toString()).toBe("12");
  });

  it("uses exact decimal cents and loyalty prices", () => {
    expect(dollarsToCents("2.675")).toBe(268);
    expect(minPrice(500, 450)).toEqual({ priceCents: 450, usesLoyalty: true });
  });
});
