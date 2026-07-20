"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";

const settingsSchema = z.object({
  householdSize: z.coerce.number().int().min(1).max(20),
  homeAddress: z.string().min(5),
  maxStoreDistanceKm: z.coerce.number().positive(),
  fuelEconomyLitresPer100Km: z.coerce.number().positive(),
  fuelPrice: z.string().min(1),
  minimumSaving: z.string().min(1),
  timezone: z.string().min(1),
  woolworthsRewards: z.coerce.boolean().optional(),
  newWorldClubcard: z.coerce.boolean().optional(),
  costcoMembership: z.coerce.boolean().optional()
});

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();
  const parsed = settingsSchema.parse(Object.fromEntries(formData));
  await prisma.userSettings.update({
    where: { userId: user.id },
    data: {
      householdSize: parsed.householdSize,
      homeAddress: parsed.homeAddress,
      maxStoreDistanceKm: parsed.maxStoreDistanceKm,
      fuelEconomyLitresPer100Km: parsed.fuelEconomyLitresPer100Km,
      fuelPriceCentsPerLitre: dollarsToCents(parsed.fuelPrice),
      minimumSavingExtraStopCents: dollarsToCents(parsed.minimumSaving),
      timezone: parsed.timezone,
      woolworthsRewards: parsed.woolworthsRewards ?? false,
      newWorldClubcard: parsed.newWorldClubcard ?? false,
      costcoMembership: parsed.costcoMembership ?? false
    }
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "update", entity: "UserSettings" } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  if (password.length < 12) throw new Error("Password must be at least 12 characters");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "password_update", entity: "User", entityId: user.id } });
  revalidatePath("/settings");
}
