"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const storeSchema = z.object({
  id: z.string().optional(),
  branchName: z.string().min(1),
  chainId: z.string().min(1),
  address: z.string().min(1),
  oneWayDistanceKm: z.coerce.number().positive().optional(),
  estimatedTravelMinutes: z.coerce.number().int().positive().optional(),
  directionNotes: z.string().optional(),
  active: z.coerce.boolean().optional(),
  insidePreferredArea: z.coerce.boolean().optional()
});

export async function saveStoreAction(formData: FormData) {
  const user = await requireUser();
  const parsed = storeSchema.parse(Object.fromEntries(formData));
  const data = {
    userId: user.id,
    chainId: parsed.chainId,
    branchName: parsed.branchName,
    address: parsed.address,
    oneWayDistanceKm: parsed.oneWayDistanceKm,
    estimatedTravelMinutes: parsed.estimatedTravelMinutes,
    directionNotes: parsed.directionNotes,
    active: parsed.active ?? false,
    insidePreferredArea: parsed.insidePreferredArea ?? false,
    requiresVerification: true
  };
  if (parsed.id) {
    await prisma.store.updateMany({ where: { id: parsed.id, userId: user.id }, data });
  } else {
    await prisma.store.create({ data });
  }
  await prisma.auditLog.create({ data: { userId: user.id, action: "save", entity: "Store", entityId: parsed.id } });
  revalidatePath("/stores");
  revalidatePath("/shopping");
}
