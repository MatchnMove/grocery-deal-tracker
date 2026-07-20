import Link from "next/link";
import { Badge, Card, Field, inputClass } from "@/components/ui";
import { addManualPriceAction, requestAutomaticPriceCollectionAction, resetAutomaticPriceCollectionAction } from "@/lib/actions/prices";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { priceText, quantityText } from "@/lib/data";
import { isPriceStale } from "@/lib/price-freshness";
import { CollectionAutoRefresh } from "@/components/collection-auto-refresh";

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const user = await requireUser();
  const [observations, stores, requirements, sources, latestRun] = await Promise.all([
    prisma.priceObservation.findMany({
      where: { userId: user.id },
      include: { priceSource: true, storeProduct: { include: { product: true, store: { include: { chain: true } } } } },
      orderBy: { collectedAt: "desc" },
      take: 50
    }),
    prisma.store.findMany({ where: { userId: user.id }, include: { chain: true }, orderBy: [{ chain: { name: "asc" } }, { branchName: "asc" }] }),
    prisma.groceryRequirement.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.priceSource.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.priceCollectionRun.findFirst({ where: { userId: user.id, lockKey: "desktop-collector" }, orderBy: { startedAt: "desc" } })
  ]);
  return (
    <>
      <CollectionAutoRefresh active={latestRun?.status === "RUNNING"} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prices</h1>
          <p className="text-sm text-ink/65">Manual prices and CSV imports feed the recommendation engine.</p>
        </div>
        <Link className="touch-target rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white" href="/prices/import">Import CSV</Link>
      </div>
      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Desktop price collector</h2>
        <p className="text-sm text-ink/65">Start the companion collector on your computer, then request a visible-browser scan of your configured stores.</p>
        <div className="flex flex-wrap gap-2">
          <form action={requestAutomaticPriceCollectionAction}>
            <button className="touch-target rounded-md bg-leaf px-4 py-2 font-semibold text-white" type="submit" disabled={latestRun?.status === "RUNNING"}>
              {latestRun?.status === "RUNNING" ? "Waiting for desktop collector…" : "Collect latest prices"}
            </button>
          </form>
          <form action={resetAutomaticPriceCollectionAction}>
            <button className="touch-target rounded-md border border-berry/30 bg-white px-4 py-2 font-semibold text-berry" type="submit" disabled={latestRun?.status !== "RUNNING"}>Reset</button>
          </form>
          <a className="touch-target rounded-md border border-leaf/30 bg-white px-4 py-2 font-semibold text-leaf" href="grocerycollector://start">Open desktop collector</a>
        </div>
        {latestRun ? <p className="text-xs text-ink/60">Latest run: {latestRun.status.replaceAll("_", " ").toLowerCase()} · {latestRun.pricesAdded} prices added · started {latestRun.startedAt.toLocaleString("en-NZ")}</p> : null}
      </Card>
      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Source Status</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div key={source.id} className="rounded-md bg-market p-3">
              <p className="font-semibold">{source.name}</p>
              <Badge tone={source.status === "ACTIVE" ? "good" : source.status === "DISABLED" ? "neutral" : "warn"}>{source.status.replaceAll("_", " ").toLowerCase()}</Badge>
              <p className="mt-2 text-xs text-ink/60">Last successful run: {source.lastSuccessfulRunAt?.toLocaleString("en-NZ") ?? "Never"}</p>
              {source.lastError ? <p className="text-xs text-berry">{source.lastError}</p> : null}
            </div>
          ))}
        </div>
      </Card>
      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Add Manual Price</h2>
        <form action={addManualPriceAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Store">
            <select className={inputClass} name="storeId">{stores.map((store) => <option key={store.id} value={store.id}>{store.chain.name} {store.branchName}</option>)}</select>
          </Field>
          <Field label="Grocery item">
            <select className={inputClass} name="requirementId">{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.name}</option>)}</select>
          </Field>
          <Field label="Product name"><input className={inputClass} name="productName" required /></Field>
          <Field label="Brand"><input className={inputClass} name="brand" /></Field>
          <Field label="Pack size"><input className={inputClass} name="packSize" type="number" step="0.001" required /></Field>
          <Field label="Unit"><input className={inputClass} name="unit" placeholder="each, kg, tin" required /></Field>
          <Field label="Normal price"><input className={inputClass} name="normalPrice" inputMode="decimal" required /></Field>
          <Field label="Loyalty price"><input className={inputClass} name="loyaltyPrice" inputMode="decimal" /></Field>
          <Field label="Product URL"><input className={inputClass} name="productUrl" type="url" /></Field>
          <button className="touch-target rounded-md bg-leaf px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">Save price</button>
        </form>
      </Card>
      <section className="grid gap-3">
        {observations.map((observation) => (
          <Card key={observation.id} className="grid gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{observation.storeProduct.product.canonicalName}</h2>
                <p className="text-sm text-ink/65">{observation.storeProduct.store.chain.name} {observation.storeProduct.store.branchName}</p>
              </div>
              <Badge tone={isPriceStale(observation.collectedAt) ? "warn" : "good"}>{isPriceStale(observation.collectedAt) ? "stale" : "fresh"}</Badge>
            </div>
            <p className="text-sm">{quantityText(observation.storeProduct.product.packageQuantity, observation.storeProduct.product.packageUnit)} · normal {priceText(observation.normalPriceCents)} · loyalty {priceText(observation.loyaltyPriceCents)}</p>
            <p className="text-xs text-ink/60">Source: {observation.priceSource.name} · Checked {observation.collectedAt.toLocaleString("en-NZ")}</p>
          </Card>
        ))}
      </section>
    </>
  );
}
