import Decimal from "decimal.js";
import type { Unit } from "./units";

export type MealIngredientInput = {
  requirementSlug: string;
  quantity: Decimal.Value;
  unit: Unit;
  contributesToList?: boolean;
};

export type WeeklyRequirement = {
  slug: string;
  quantity: Decimal;
  unit: Unit;
};

export function aggregateMealPlan(ingredients: MealIngredientInput[]) {
  const totals = new Map<string, WeeklyRequirement>();
  for (const ingredient of ingredients) {
    if (ingredient.contributesToList === false) continue;
    const existing = totals.get(ingredient.requirementSlug);
    if (!existing) {
      totals.set(ingredient.requirementSlug, {
        slug: ingredient.requirementSlug,
        quantity: new Decimal(ingredient.quantity),
        unit: ingredient.unit
      });
      continue;
    }
    if (existing.unit !== ingredient.unit) {
      throw new Error(`Mixed units for ${ingredient.requirementSlug} must be normalised before aggregation`);
    }
    existing.quantity = existing.quantity.plus(ingredient.quantity);
  }
  return [...totals.values()];
}
