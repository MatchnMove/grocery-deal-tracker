"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normaliseUnit } from "@/lib/units";

const ingredientSchema = z.object({
  mealId: z.string().min(1),
  requirementId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1)
});

export async function addIngredientAction(formData: FormData) {
  const user = await requireUser();
  const parsed = ingredientSchema.parse(Object.fromEntries(formData));
  const unit = normaliseUnit(parsed.unit);
  if (!unit) throw new Error("Unsupported unit");
  const meal = await prisma.meal.findFirst({ where: { id: parsed.mealId, day: { mealPlan: { userId: user.id } } } });
  if (!meal) throw new Error("Meal not found");
  await prisma.ingredient.create({
    data: {
      mealId: parsed.mealId,
      groceryRequirementId: parsed.requirementId,
      name: parsed.name,
      quantity: parsed.quantity,
      unit
    }
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "ingredient_create", entity: "Ingredient" } });
  revalidatePath("/meals");
}
