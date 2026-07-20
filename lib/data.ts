import Decimal from "decimal.js";
import { prisma } from "./prisma";
import { isPriceStale } from "./price-freshness";
import { centsToDollars, minPrice } from "./money";
import { unitLabel, type Unit } from "./units";

export async function getDashboardSnapshot(userId: string) {
  const [settings, list, sources, latestObservation, missingPrices] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.shoppingList.findFirst({ where: { userId, status: "active" }, orderBy: { weekStartsOn: "desc" } }),
    prisma.priceSource.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.priceObservation.findFirst({ where: { userId }, orderBy: { collectedAt: "desc" } }),
    prisma.groceryRequirement.count({
      where: {
        userId,
        shoppingListItems: { none: { selectedStoreProductId: { not: null } } }
      }
    })
  ]);
  const autoConfigured = sources.some((source) => source.enabled && source.adapterKey !== "manual" && source.adapterKey !== "csv");
  return {
    weeklyCost: list?.totalCents ?? 0,
    monthlyCost: Math.round((list?.totalCents ?? 0) * 4.33),
    saving: 0,
    recommendedStops: list ? await prisma.shoppingListItem.groupBy({ by: ["storeId"], where: { shoppingListId: list.id, storeId: { not: null } } }).then((rows) => rows.length) : 0,
    bestMainSupermarket: "Needs prices",
    lastPriceUpdate: latestObservation?.collectedAt ?? null,
    hasStalePrices: latestObservation ? isPriceStale(latestObservation.collectedAt) : false,
    missingPrices,
    autoCollectionStatus: autoConfigured ? "Automatic price collection is configured." : "Automatic price collection is not configured. Manual prices are currently being used.",
    settings
  };
}

export async function getShoppingListSnapshot(userId: string) {
  const list =
    (await prisma.shoppingList.findFirst({
      where: { userId, status: "active" },
      include: {
        items: {
          include: {
            groceryRequirement: true,
            selectedStoreProduct: { include: { product: true, store: { include: { chain: true } }, priceObservations: { orderBy: { collectedAt: "desc" }, take: 1 } } },
            store: { include: { chain: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { weekStartsOn: "desc" }
    })) ?? (await regenerateShoppingList(userId));
  return list;
}

export async function regenerateShoppingList(userId: string) {
  const requirements = await prisma.groceryRequirement.findMany({ where: { userId }, include: { category: true }, orderBy: { name: "asc" } });
  const stores = await prisma.store.findMany({ where: { userId, active: true }, include: { chain: true } });
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const list = await prisma.shoppingList.create({
    data: {
      userId,
      name: "Current weekly shop",
      weekStartsOn: startOfWeek(new Date()),
      status: "active"
    }
  });
  let groceryCents = 0;
  const usedStores = new Set<string>();
  for (const requirement of requirements) {
    const candidates = await prisma.storeProduct.findMany({
      where: {
        active: true,
        store: { userId, active: true },
        product: { categoryId: requirement.categoryId }
      },
      include: {
        store: true,
        product: true,
        priceObservations: { orderBy: { collectedAt: "desc" }, take: 1 }
      }
    });
    const ranked = candidates
      .map((candidate) => {
        const latest = candidate.priceObservations[0];
        if (!latest) return null;
        const effective = minPrice(latest.normalPriceCents, latest.loyaltyPriceCents);
        const packs = Math.ceil(new Decimal(requirement.requiredQuantity).div(candidate.product.packageQuantity).toNumber());
        return { candidate, latest, packs, effectivePriceCents: effective.priceCents * packs, usesLoyalty: effective.usesLoyalty };
      })
      .filter((value): value is NonNullable<typeof value> => value != null)
      .sort((a, b) => a.effectivePriceCents - b.effectivePriceCents)[0];
    if (ranked) {
      groceryCents += ranked.effectivePriceCents;
      usedStores.add(ranked.candidate.storeId);
    }
    await prisma.shoppingListItem.create({
      data: {
        shoppingListId: list.id,
        groceryRequirementId: requirement.id,
        selectedStoreProductId: ranked?.candidate.id,
        storeId: ranked?.candidate.storeId,
        requiredQuantity: requirement.requiredQuantity,
        requiredUnit: requirement.requiredUnit,
        packsNeeded: ranked?.packs ?? 0,
        leftoverQuantity: 0,
        effectivePriceCents: ranked?.effectivePriceCents,
        unitPriceCents: ranked ? Math.round(ranked.latest.normalPriceCents / Number(ranked.candidate.product.packageQuantity)) : null,
        requiresLoyaltyCard: ranked?.usesLoyalty ?? false,
        lastCheckedAt: ranked?.latest.collectedAt
      }
    });
  }
  const fuelCents = stores
    .filter((store) => usedStores.has(store.id))
    .reduce((sum, store) => {
      if (!store.oneWayDistanceKm || !settings) return sum;
      return sum + new Decimal(store.oneWayDistanceKm).mul(2).div(100).mul(settings.fuelEconomyLitresPer100Km).mul(settings.fuelPriceCentsPerLitre).round().toNumber();
    }, 0);
  return prisma.shoppingList.update({
    where: { id: list.id },
    data: { groceryCents, fuelCents, totalCents: groceryCents + fuelCents },
    include: {
      items: {
        include: {
          groceryRequirement: true,
          selectedStoreProduct: { include: { product: true, store: { include: { chain: true } }, priceObservations: { orderBy: { collectedAt: "desc" }, take: 1 } } },
          store: { include: { chain: true } }
        }
      }
    }
  });
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function priceText(cents?: number | null) {
  return cents == null ? "Missing" : centsToDollars(cents);
}

export function quantityText(quantity: Decimal.Value, unit: Unit) {
  return `${new Decimal(quantity).toString()} ${unitLabel(unit)}`;
}
