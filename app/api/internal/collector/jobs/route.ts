import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCronSecret } from "@/lib/env";
import { regenerateShoppingList } from "@/lib/data";

const resultSchema = z.object({
  storeId: z.string().min(1),
  requirementId: z.string().min(1),
  externalId: z.string().optional(),
  name: z.string().min(1).max(300),
  brand: z.string().max(120).optional(),
  packageQuantity: z.number().positive(),
  packageUnit: z.enum(["EACH", "PACK", "TIN", "JAR", "LOAF", "GRAM", "KILOGRAM", "MILLILITRE", "LITRE"]),
  normalPriceCents: z.number().int().positive(),
  loyaltyPriceCents: z.number().int().positive().nullable().optional(),
  productUrl: z.string().url(),
  collectedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1).default(0.7)
});

const submissionSchema = z.object({
  runId: z.string().min(1),
  results: z.array(resultSchema).max(500),
  warnings: z.array(z.string().max(500)).max(100).default([]),
  errors: z.array(z.string().max(500)).max(100).default([])
});

function authorised(request: NextRequest) {
  const supplied = request.headers.get("x-collector-secret");
  return Boolean(supplied && supplied === requireCronSecret());
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const run = await prisma.priceCollectionRun.findFirst({
    where: { status: "RUNNING", lockKey: "desktop-collector" },
    orderBy: { startedAt: "asc" }
  });
  if (!run) return new NextResponse(null, { status: 204 });
  const [stores, requirements] = await Promise.all([
    prisma.store.findMany({ where: { userId: run.userId, active: true }, include: { chain: true } }),
    prisma.groceryRequirement.findMany({ where: { userId: run.userId }, include: { category: true } })
  ]);
  return NextResponse.json({
    runId: run.id,
    stores: stores.map((store) => ({ id: store.id, branchName: store.branchName, address: store.address, chain: store.chain.slug })),
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      requiredQuantity: Number(requirement.requiredQuantity),
      requiredUnit: requirement.requiredUnit,
      acceptableTerms: requirement.category.acceptableTerms,
      excludedTerms: requirement.category.excludedTerms
    }))
  });
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const submission = submissionSchema.parse(await request.json());
  const run = await prisma.priceCollectionRun.findFirst({ where: { id: submission.runId, status: "RUNNING", lockKey: "desktop-collector" } });
  if (!run) return NextResponse.json({ error: "Collection run is not active" }, { status: 409 });

  let pricesAdded = 0;
  for (const result of submission.results) {
    const [store, requirement] = await Promise.all([
      prisma.store.findFirst({ where: { id: result.storeId, userId: run.userId }, include: { chain: true } }),
      prisma.groceryRequirement.findFirst({ where: { id: result.requirementId, userId: run.userId } })
    ]);
    if (!store || !requirement) continue;
    const source = await prisma.priceSource.upsert({
      where: { userId_slug: { userId: run.userId, slug: store.chain.slug } },
      update: { enabled: true, status: "ACTIVE", lastError: null, lastSuccessfulRunAt: new Date() },
      create: { userId: run.userId, name: `${store.chain.name} desktop collector`, slug: store.chain.slug, adapterKey: store.chain.slug, enabled: true, status: "ACTIVE", lastSuccessfulRunAt: new Date() }
    });
    let product = await prisma.product.findFirst({
      where: { userId: run.userId, categoryId: requirement.categoryId, canonicalName: result.name, packageUnit: result.packageUnit, packageQuantity: result.packageQuantity }
    });
    product ??= await prisma.product.create({ data: { userId: run.userId, categoryId: requirement.categoryId, canonicalName: result.name, brand: result.brand, packageQuantity: result.packageQuantity, packageUnit: result.packageUnit, productUrl: result.productUrl } });
    let storeProduct = await prisma.storeProduct.findFirst({ where: { storeId: store.id, productId: product.id, supermarketName: result.name } });
    storeProduct ??= await prisma.storeProduct.create({ data: { storeId: store.id, productId: product.id, supermarketName: result.name, supermarketSku: result.externalId, productUrl: result.productUrl } });
    await prisma.priceObservation.create({
      data: { userId: run.userId, storeProductId: storeProduct.id, priceSourceId: source.id, normalPriceCents: result.normalPriceCents, loyaltyPriceCents: result.loyaltyPriceCents, requiresLoyaltyCard: result.loyaltyPriceCents != null, collectedAt: new Date(result.collectedAt), sourceConfidence: result.confidence, entryMethod: "AUTOMATED", originalSource: result.productUrl }
    });
    pricesAdded += 1;
  }

  const status = submission.errors.length ? (pricesAdded ? "PARTIAL_SUCCESS" : "FAILED") : "SUCCESS";
  await prisma.priceCollectionRun.update({ where: { id: run.id }, data: { status, endedAt: new Date(), productsChecked: submission.results.length, pricesAdded, warnings: submission.warnings, errors: submission.errors } });
  await prisma.shoppingList.updateMany({ where: { userId: run.userId, status: "active" }, data: { status: "archived" } });
  await regenerateShoppingList(run.userId);
  return NextResponse.json({ status, pricesAdded });
}
