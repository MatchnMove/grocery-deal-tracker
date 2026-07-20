import { Card } from "@/components/ui";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PriceHistoryPage() {
  const user = await requireUser();
  const observations = await prisma.priceObservation.findMany({
    where: { userId: user.id },
    include: { storeProduct: { include: { product: true, store: { include: { chain: true } } } } },
    orderBy: { collectedAt: "asc" }
  });
  const grouped = new Map<string, typeof observations>();
  for (const observation of observations) {
    const category = observation.storeProduct.product.canonicalName;
    grouped.set(category, [...(grouped.get(category) ?? []), observation]);
  }
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Price History</h1>
        <p className="text-sm text-ink/65">Normal and loyalty prices over time without compressed chart scales.</p>
      </div>
      <section className="grid gap-3 lg:grid-cols-2">
        {[...grouped.entries()].map(([name, rows]) => (
          <Card key={name}>
            <h2 className="mb-3 font-semibold">{name}</h2>
            <PriceHistoryChart data={rows.map((row) => ({ date: row.collectedAt.toLocaleDateString("en-NZ"), normal: row.normalPriceCents / 100, loyalty: row.loyaltyPriceCents ? row.loyaltyPriceCents / 100 : null }))} />
          </Card>
        ))}
      </section>
    </>
  );
}
