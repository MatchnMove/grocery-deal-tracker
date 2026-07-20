"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { regenerateShoppingList } from "@/lib/data";

export async function regenerateShoppingListAction() {
  const user = await requireUser();
  await prisma.shoppingList.updateMany({ where: { userId: user.id, status: "active" }, data: { status: "archived" } });
  await regenerateShoppingList(user.id);
  await prisma.auditLog.create({ data: { userId: user.id, action: "regenerate", entity: "ShoppingList" } });
  revalidatePath("/shopping");
  revalidatePath("/dashboard");
}

export async function toggleShoppingItemAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  if (!["purchased", "alreadyOwned"].includes(field)) return;
  const item = await prisma.shoppingListItem.findFirst({ where: { id, shoppingList: { userId: user.id } } });
  if (!item) return;
  await prisma.shoppingListItem.update({ where: { id }, data: { [field]: !item[field as "purchased" | "alreadyOwned"] } });
  await prisma.auditLog.create({ data: { userId: user.id, action: `toggle_${field}`, entity: "ShoppingListItem", entityId: id } });
  revalidatePath("/shopping");
}
