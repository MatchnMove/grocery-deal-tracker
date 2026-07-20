import { describe, expect, it } from "vitest";
import { aggregateMealPlan } from "../lib/meal-plan";

describe("meal-plan aggregation", () => {
  it("does not double-count Sunday eggs when already included in the weekly requirement", () => {
    const totals = aggregateMealPlan([
      { requirementSlug: "eggs", quantity: 42, unit: "EACH" },
      { requirementSlug: "eggs", quantity: 2, unit: "EACH", contributesToList: false }
    ]);
    expect(totals.find((item) => item.slug === "eggs")?.quantity.toString()).toBe("42");
  });
});
