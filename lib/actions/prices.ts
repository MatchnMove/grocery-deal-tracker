"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { normaliseUnit } from "@/lib/units";
import { previewCsv } from "@/lib/csv-import";

const manualPriceSchema = z.object({
  storeId: z.string().min(1),
  requirementId: z.string().min(1),
  productName: z.string().min(1),
  brand: z.string().optional(),
  packSize: z.coerce.number().positive(),
  unit: z.string().min(1),
  normalPrice: z.string().min(1),
  loyaltyPrice: z.string().optional(),
  productUrl: z.string().url().optional().or(z.literal(""))
});

export async function addManualPriceAction(formData: FormData) {
  const user = await requireUser();
  const parsed = manualPriceSchema.parse(Object.fromEntries(formData));
  const unit = normaliseUnit(parsed.unit);
  if (!unit) throw new Error("Unsupported unit");
  const [store, requirement, source] = await Promise.all([
    prisma.store.findFirst({ where: { id: parsed.storeId, userId: user.id } }),
    prisma.groceryRequirement.findFirst({ where: { id: parsed.requirementId, userId: user.id } }),
    prisma.priceSource.findUnique({ where: { userId_slug: { userId: user.id, slug: "manual" } } })
  ]);
  if (!store || !requirement || !source) throw new Error("Invalid manual price");
  const product = await prisma.product.create({
    data: {
      userId: user.id,
      categoryId: requirement.categoryId,
      canonicalName: parsed.productName,
      brand: parsed.brand || null,
      packageQuantity: parsed.packSize,
      packageUnit: unit,
      productUrl: parsed.productUrl || null
    }
  });
  const storeProduct = await prisma.storeProduct.create({
    data: {
      storeId: store.id,
      productId: product.id,
      supermarketName: parsed.productName,
      productUrl: parsed.productUrl || null
    }
  });
  await prisma.priceObservation.create({
    data: {
      userId: user.id,
      storeProductId: storeProduct.id,
      priceSourceId: source.id,
      normalPriceCents: dollarsToCents(parsed.normalPrice),
      loyaltyPriceCents: parsed.loyaltyPrice ? dollarsToCents(parsed.loyaltyPrice) : null,
      requiresLoyaltyCard: Boolean(parsed.loyaltyPrice),
      collectedAt: new Date(),
      sourceConfidence: 1,
      entryMethod: "MANUAL",
      originalSource: "Manual price entry"
    }
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "manual_price_create", entity: "PriceObservation" } });
  revalidatePath("/prices");
  revalidatePath("/shopping");
}

export async function importCsvPricesAction(formData: FormData) {
  const user = await requireUser();
  const csv = String(formData.get("csv") ?? "");
  if (csv.length > 512_000) throw new Error("CSV upload is too large");
  const rows = previewCsv(csv);
  const validRows = rows.filter((row) => row.ok);
  const source = await prisma.priceSource.findUnique({ where: { userId_slug: { userId: user.id, slug: "csv-import" } } });
  if (!source) throw new Error("CSV price source is missing");
  for (const row of validRows) {
    const value = row.value;
    const store = await prisma.store.findFirst({
      where: { userId: user.id, branchName: value.branch, chain: { name: value.store } },
      include: { chain: true }
    });
    if (!store) continue;
    const category = await prisma.productCategory.findFirst({ where: { userId: user.id, name: { contains: value.productName, mode: "insensitive" } } });
    const fallbackCategory = category ?? (await prisma.productCategory.findFirst({ where: { userId: user.id } }));
    if (!fallbackCategory) continue;
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        categoryId: fallbackCategory.id,
        canonicalName: value.productName,
        brand: value.brand,
        packageQuantity: value.packSize,
        packageUnit: value.unit,
        productUrl: value.productUrl
      }
    });
    const storeProduct = await prisma.storeProduct.create({
      data: { storeId: store.id, productId: product.id, supermarketName: value.productName, productUrl: value.productUrl }
    });
    await prisma.priceObservation.create({
      data: {
        userId: user.id,
        storeProductId: storeProduct.id,
        priceSourceId: source.id,
        normalPriceCents: value.normalPriceCents,
        loyaltyPriceCents: value.loyaltyPriceCents,
        requiresLoyaltyCard: value.loyaltyPriceCents != null,
        specialStart: value.specialStart,
        specialEnd: value.specialEnd,
        collectedAt: value.checkedAt,
        sourceConfidence: 0.9,
        entryMethod: "CSV_IMPORT",
        originalSource: "CSV import"
      }
    });
  }
  await prisma.auditLog.create({ data: { userId: user.id, action: "csv_price_import", entity: "PriceObservation", metadata: { validRows: validRows.length, invalidRows: rows.length - validRows.length } } });
  revalidatePath("/prices");
  revalidatePath("/shopping");
}

export async function requestAutomaticPriceCollectionAction() {
  const user = await requireUser();
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
  await prisma.priceCollectionRun.updateMany({
    where: { userId: user.id, status: "RUNNING", lockKey: "desktop-collector", startedAt: { lt: staleBefore } },
    data: { status: "FAILED", endedAt: new Date(), errors: ["Collector did not claim and complete this job within 30 minutes."] }
  });
  const active = await prisma.priceCollectionRun.findFirst({
    where: { userId: user.id, status: "RUNNING", lockKey: "desktop-collector" }
  });
  if (!active) {
    await prisma.priceCollectionRun.create({
      data: { userId: user.id, status: "RUNNING", lockKey: "desktop-collector" }
    });
  }
  revalidatePath("/prices");
  revalidatePath("/dashboard");
}

export async function resetAutomaticPriceCollectionAction() {
  const user = await requireUser();
  await prisma.priceCollectionRun.updateMany({
    where: { userId: user.id, status: "RUNNING", lockKey: "desktop-collector" },
    data: { status: "FAILED", endedAt: new Date(), errors: ["Collection was reset by the administrator."] }
  });
  revalidatePath("/prices");
  revalidatePath("/dashboard");
}
