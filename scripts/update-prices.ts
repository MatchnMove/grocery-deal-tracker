import { prisma } from "../lib/prisma";

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cronSecret = process.env.CRON_SECRET;
  if (!appUrl || !cronSecret) {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (admin) {
      await prisma.priceCollectionRun.create({
        data: {
          userId: admin.id,
          status: "SKIPPED",
          startedAt: new Date(),
          endedAt: new Date(),
          warnings: ["NEXT_PUBLIC_APP_URL or CRON_SECRET is missing; no automatic collection was run."],
          errors: []
        }
      });
    }
    console.log("Automatic price collection is not configured. Manual prices are currently being used.");
    return;
  }
  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/price-collection/run`, {
    method: "POST",
    headers: { "x-cron-secret": cronSecret }
  });
  console.log(await response.text());
  if (!response.ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Price update failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
