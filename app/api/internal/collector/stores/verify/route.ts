import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCollectorSecret } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-collector-secret") !== requireCollectorSecret()) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const placeholders = await prisma.store.findMany({
    where: { branchName: { contains: "placeholder", mode: "insensitive" }, address: { startsWith: "Requires verification" } },
    select: { id: true }
  });
  const ids = placeholders.map((store) => store.id);
  const result = await prisma.$transaction(async (tx) => {
    if (ids.length) {
      await tx.shoppingListItem.updateMany({ where: { storeId: { in: ids } }, data: { storeId: null, selectedStoreProductId: null } });
      await tx.store.deleteMany({ where: { id: { in: ids } } });
    }
    const verified = await tx.store.updateMany({
      where: { id: { notIn: ids }, active: true, branchName: { not: { contains: "placeholder" } } },
      data: { requiresVerification: false, lastVerifiedAt: new Date() }
    });
    return { removed: ids.length, verified: verified.count };
  });
  return NextResponse.json(result);
}
