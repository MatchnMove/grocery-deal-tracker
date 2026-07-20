import { PrismaClient, type MeasurementUnit } from "@prisma/client";
import bcrypt from "bcryptjs";
import { dollarsToCents } from "../lib/money";

const prisma = new PrismaClient();

const requirements: {
  slug: string;
  name: string;
  quantity: string;
  unit: MeasurementUnit;
  category: string;
  comparableUnit: MeasurementUnit;
  acceptableTerms: string[];
  excludedTerms: string[];
  notes?: string;
}[] = [
  { slug: "eggs", name: "Eggs", quantity: "42", unit: "EACH", category: "Eggs", comparableUnit: "EACH", acceptableTerms: ["egg", "eggs"], excludedTerms: [] },
  { slug: "sardines", name: "Sardines", quantity: "10", unit: "TIN", category: "Sardines", comparableUnit: "TIN", acceptableTerms: ["sardine", "tomato", "plain"], excludedTerms: ["mackerel", "tuna"] },
  { slug: "salami-stick", name: "Salami stick", quantity: "1", unit: "PACK", category: "Salami", comparableUnit: "PACK", acceptableTerms: ["salami"], excludedTerms: [] },
  { slug: "beef-mince", name: "Beef mince", quantity: "1", unit: "KILOGRAM", category: "Beef mince", comparableUnit: "KILOGRAM", acceptableTerms: ["beef mince", "mince"], excludedTerms: ["pork", "chicken"] },
  { slug: "rice", name: "Rice", quantity: "1", unit: "KILOGRAM", category: "Rice", comparableUnit: "KILOGRAM", acceptableTerms: ["rice"], excludedTerms: ["microwave", "risotto"] },
  { slug: "roast-chicken", name: "Ready-made roast chicken", quantity: "1", unit: "EACH", category: "Cooked roast chicken", comparableUnit: "EACH", acceptableTerms: ["roast chicken", "cooked chicken"], excludedTerms: ["raw", "breast"] },
  { slug: "buns", name: "Buns", quantity: "1", unit: "PACK", category: "Buns", comparableUnit: "PACK", acceptableTerms: ["bun", "buns", "rolls"], excludedTerms: [] },
  { slug: "chicken-breast", name: "Chicken breast", quantity: "1", unit: "KILOGRAM", category: "Chicken breast", comparableUnit: "KILOGRAM", acceptableTerms: ["chicken breast"], excludedTerms: ["roast", "cooked"] },
  { slug: "curry-sauce", name: "Curry sauce", quantity: "1", unit: "JAR", category: "Curry sauce", comparableUnit: "JAR", acceptableTerms: ["butter chicken", "rogan josh", "curry sauce"], excludedTerms: [] },
  { slug: "brown-bread", name: "Brown bread", quantity: "1", unit: "LOAF", category: "Brown bread", comparableUnit: "LOAF", acceptableTerms: ["brown", "wholemeal", "wheatmeal"], excludedTerms: ["white"] }
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be supplied before seeding.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN"
    }
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      householdSize: 2,
      homeAddress: "35 Blacks Road, Greenhithe, Auckland",
      maxStoreDistanceKm: "10",
      avoidAucklandCbd: true,
      timezone: process.env.DEFAULT_TIMEZONE ?? "Pacific/Auckland",
      currency: "NZD",
      fuelEconomyLitresPer100Km: process.env.DEFAULT_FUEL_ECONOMY_L_PER_100KM ?? "7.5",
      fuelPriceCentsPerLitre: dollarsToCents(process.env.DEFAULT_FUEL_PRICE_NZD ?? "2.70"),
      minimumSavingExtraStopCents: 500,
      woolworthsRewards: true,
      newWorldClubcard: true,
      costcoMembership: false
    }
  });

  const chains = await Promise.all(
    [
      ["Woolworths", "woolworths"],
      ["PAK'nSAVE", "paknsave"],
      ["New World", "new-world"]
    ].map(([name, slug]) => prisma.supermarketChain.upsert({ where: { slug }, update: { name }, create: { name, slug } }))
  );

  const storeSeeds = [
    { chain: "woolworths", branchName: "Greenhithe nearby branch placeholder", address: "Requires verification near Greenhithe, Auckland" },
    { chain: "paknsave", branchName: "North Shore branch placeholder", address: "Requires verification on the North Shore, Auckland" },
    { chain: "new-world", branchName: "North Shore branch placeholder", address: "Requires verification on the North Shore, Auckland" }
  ];
  for (const seed of storeSeeds) {
    const chain = chains.find((item) => item.slug === seed.chain);
    if (!chain) continue;
    await prisma.store.upsert({
      where: { userId_chainId_branchName: { userId: user.id, chainId: chain.id, branchName: seed.branchName } },
      update: {},
      create: {
        userId: user.id,
        chainId: chain.id,
        branchName: seed.branchName,
        address: seed.address,
        active: true,
        insidePreferredArea: true,
        requiresVerification: true,
        directionNotes: "Placeholder only. Verify distance, travel time and preferred direction before relying on route recommendations."
      }
    });
  }

  const categoryBySlug = new Map<string, string>();
  for (const requirement of requirements) {
    const category = await prisma.productCategory.upsert({
      where: { userId_slug: { userId: user.id, slug: requirement.slug } },
      update: {
        acceptableTerms: requirement.acceptableTerms,
        excludedTerms: requirement.excludedTerms,
        comparableUnit: requirement.comparableUnit
      },
      create: {
        userId: user.id,
        slug: requirement.slug,
        name: requirement.category,
        comparableUnit: requirement.comparableUnit,
        acceptableTerms: requirement.acceptableTerms,
        excludedTerms: requirement.excludedTerms
      }
    });
    categoryBySlug.set(requirement.slug, category.id);
    await prisma.groceryRequirement.upsert({
      where: { userId_slug: { userId: user.id, slug: requirement.slug } },
      update: {
        requiredQuantity: requirement.quantity,
        requiredUnit: requirement.unit,
        substitutionNotes: requirement.notes
      },
      create: {
        userId: user.id,
        categoryId: category.id,
        slug: requirement.slug,
        name: requirement.name,
        requiredQuantity: requirement.quantity,
        requiredUnit: requirement.unit,
        substitutionNotes: requirement.notes
      }
    });
  }

  for (const requirement of requirements) {
    const categoryId = categoryBySlug.get(requirement.slug);
    if (!categoryId) continue;
    const product = await prisma.product.findFirst({ where: { userId: user.id, categoryId, canonicalName: requirement.name } });
    const existingOrCreated =
      product ??
      (await prisma.product.create({
        data: {
          userId: user.id,
          categoryId,
          canonicalName: requirement.name,
          packageQuantity: requirement.quantity,
          packageUnit: requirement.unit
        }
      }));
    for (const alias of [requirement.name, ...requirement.acceptableTerms]) {
      await prisma.productAlias.upsert({
        where: { productId_alias: { productId: existingOrCreated.id, alias } },
        update: {},
        create: { productId: existingOrCreated.id, alias, status: "APPROVED" }
      });
    }
  }

  await seedMealPlan(user.id);

  for (const source of [
    { name: "Manual price entry", slug: "manual", status: "ACTIVE", adapterKey: "manual", enabled: true },
    { name: "CSV import", slug: "csv-import", status: "ACTIVE", adapterKey: "csv-import", enabled: true },
    { name: "Woolworths future integration", slug: "woolworths", status: "DISABLED", adapterKey: "woolworths", enabled: false },
    { name: "PAK'nSAVE future integration", slug: "paknsave", status: "DISABLED", adapterKey: "paknsave", enabled: false },
    { name: "New World future integration", slug: "new-world", status: "DISABLED", adapterKey: "new-world", enabled: false }
  ] as const) {
    await prisma.priceSource.upsert({
      where: { userId_slug: { userId: user.id, slug: source.slug } },
      update: { status: source.status, adapterKey: source.adapterKey, enabled: source.enabled },
      create: { userId: user.id, ...source }
    });
  }

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      pricesUpdated: false,
      missingPriceWarning: true,
      stalePriceWarning: true,
      weeklyListReady: false
    }
  });
}

async function seedMealPlan(userId: string) {
  const plan =
    (await prisma.mealPlan.findFirst({ where: { userId, name: "Default weekly meal plan" } })) ??
    (await prisma.mealPlan.create({ data: { userId, name: "Default weekly meal plan", active: true } }));
  const reqs = await prisma.groceryRequirement.findMany({ where: { userId } });
  const bySlug = new Map(reqs.map((req) => [req.slug, req]));
  const mealSeeds = [
    { days: [0, 1, 2, 3, 4, 5, 6], type: "BREAKFAST" as const, title: "Eggs", ingredients: [{ slug: "eggs", name: "Eggs", quantity: "6", unit: "EACH" as MeasurementUnit, contributes: false }] },
    { days: [0], type: "BREAKFAST" as const, title: "Brown toast option", ingredients: [{ slug: "brown-bread", name: "Brown toast", quantity: "1", unit: "LOAF" as MeasurementUnit, contributes: true }] },
    { days: [0, 1, 2, 3, 4], type: "LUNCH" as const, title: "Sardines and salami", ingredients: [{ slug: "sardines", name: "Sardines", quantity: "2", unit: "TIN" as MeasurementUnit, contributes: false }, { slug: "salami-stick", name: "Salami stick", quantity: "0.2", unit: "PACK" as MeasurementUnit, contributes: false }] },
    { days: [1, 2], type: "DINNER" as const, title: "Beef mince and rice", ingredients: [{ slug: "beef-mince", name: "Beef mince", quantity: "0.5", unit: "KILOGRAM" as MeasurementUnit, contributes: false }, { slug: "rice", name: "Rice", quantity: "0.5", unit: "KILOGRAM" as MeasurementUnit, contributes: false }] },
    { days: [3, 4], type: "DINNER" as const, title: "Roast chicken buns", ingredients: [{ slug: "roast-chicken", name: "Ready-made roast chicken", quantity: "0.5", unit: "EACH" as MeasurementUnit, contributes: false }, { slug: "buns", name: "Buns", quantity: "0.5", unit: "PACK" as MeasurementUnit, contributes: false }] },
    { days: [5, 6], type: "DINNER" as const, title: "Chicken curry", ingredients: [{ slug: "chicken-breast", name: "Chicken breast", quantity: "0.5", unit: "KILOGRAM" as MeasurementUnit, contributes: false }, { slug: "curry-sauce", name: "Curry sauce", quantity: "0.5", unit: "JAR" as MeasurementUnit, contributes: false }] },
    { days: [0], type: "DINNER" as const, title: "Sunday brown toast and eggs", ingredients: [{ slug: "brown-bread", name: "Brown toast", quantity: "0", unit: "LOAF" as MeasurementUnit, contributes: false }, { slug: "eggs", name: "Eggs already counted", quantity: "0", unit: "EACH" as MeasurementUnit, contributes: false }] }
  ];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const day = await prisma.mealPlanDay.upsert({
      where: { mealPlanId_dayOfWeek: { mealPlanId: plan.id, dayOfWeek } },
      update: {},
      create: { mealPlanId: plan.id, dayOfWeek }
    });
    for (const seed of mealSeeds.filter((item) => item.days.includes(dayOfWeek))) {
      const existingMeal = await prisma.meal.findFirst({ where: { mealPlanDayId: day.id, type: seed.type, title: seed.title } });
      const meal = existingMeal ?? (await prisma.meal.create({ data: { mealPlanDayId: day.id, type: seed.type, title: seed.title, servings: 2 } }));
      const existingIngredients = await prisma.ingredient.count({ where: { mealId: meal.id } });
      if (existingIngredients === 0) {
        for (const ingredient of seed.ingredients) {
          await prisma.ingredient.create({
            data: {
              mealId: meal.id,
              groceryRequirementId: bySlug.get(ingredient.slug)?.id,
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              contributesToList: ingredient.contributes
            }
          });
        }
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
