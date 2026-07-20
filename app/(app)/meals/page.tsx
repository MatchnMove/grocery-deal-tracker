import { Card, Field, inputClass } from "@/components/ui";
import { addIngredientAction } from "@/lib/actions/meals";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quantityText } from "@/lib/data";

export const dynamic = "force-dynamic";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function MealsPage() {
  const user = await requireUser();
  const [plan, requirements] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { userId: user.id, active: true },
      include: { days: { include: { meals: { include: { ingredients: true }, orderBy: { type: "asc" } } }, orderBy: { dayOfWeek: "asc" } } }
    }),
    prisma.groceryRequirement.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Meal Plan</h1>
        <p className="text-sm text-ink/65">Seven-day plan for two people. Quantities are editable.</p>
      </div>
      <section className="grid gap-3 lg:grid-cols-2">
        {plan?.days.map((day) => (
          <Card key={day.id} className="grid gap-3">
            <h2 className="text-lg font-semibold">{days[day.dayOfWeek]}</h2>
            {day.meals.map((meal) => (
              <div key={meal.id} className="rounded-md bg-market p-3">
                <p className="font-semibold">{meal.title}</p>
                <p className="text-xs uppercase tracking-wide text-ink/55">{meal.type.toLowerCase()} · {meal.servings} servings</p>
                <ul className="mt-2 grid gap-1 text-sm text-ink/75">
                  {meal.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>{ingredient.name}: {quantityText(ingredient.quantity, ingredient.unit)}</li>
                  ))}
                </ul>
                <form action={addIngredientAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="mealId" value={meal.id} />
                  <Field label="Ingredient"><input className={inputClass} name="name" /></Field>
                  <Field label="Requirement">
                    <select className={inputClass} name="requirementId">{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.name}</option>)}</select>
                  </Field>
                  <Field label="Quantity"><input className={inputClass} name="quantity" type="number" step="0.001" /></Field>
                  <Field label="Unit"><input className={inputClass} name="unit" placeholder="each, kg, jar" /></Field>
                  <button className="touch-target rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white sm:col-span-2" type="submit">Add ingredient</button>
                </form>
              </div>
            ))}
          </Card>
        ))}
      </section>
    </>
  );
}
