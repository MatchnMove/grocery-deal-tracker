import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCronSecret } from "@/lib/env";

export async function POST(request: NextRequest) {
  const supplied = request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");
  if (supplied !== requireCronSecret()) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const running = await prisma.priceCollectionRun.findFirst({ where: { status: "RUNNING" } });
  if (running) {
    return NextResponse.json({ status: "skipped", reason: "A price collection run is already active" }, { status: 409 });
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) return NextResponse.json({ error: "No administrator has been seeded" }, { status: 503 });
  const run = await prisma.priceCollectionRun.create({
    data: {
      userId: admin.id,
      status: "SKIPPED",
      startedAt: new Date(),
      endedAt: new Date(),
      warnings: ["Automatic supermarket collection is not configured. Manual and CSV prices remain available."],
      errors: []
    }
  });
  return NextResponse.json({
    status: run.status,
    productsChecked: run.productsChecked,
    pricesAdded: run.pricesAdded,
    warning: "Automatic price collection is not configured. Manual prices are currently being used."
  });
}
