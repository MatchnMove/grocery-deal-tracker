import { RefreshCcw } from "lucide-react";
import { Badge, Card, StatusLine } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getShoppingListSnapshot, priceText, quantityText } from "@/lib/data";
import { regenerateShoppingListAction, toggleShoppingItemAction } from "@/lib/actions/shopping";
import { isPriceStale } from "@/lib/price-freshness";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const user = await requireUser();
  const list = await getShoppingListSnapshot(user.id);
  const totalsByStore = new Map<string, number>();
  for (const item of list.items) {
    const key = item.store ? `${item.store.chain.name} ${item.store.branchName}` : "Missing prices";
    totalsByStore.set(key, (totalsByStore.get(key) ?? 0) + (item.effectivePriceCents ?? 0));
  }
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Shopping List</h1>
          <p className="text-sm text-ink/65">Generated from the weekly meal plan.</p>
        </div>
        <form action={regenerateShoppingListAction}>
          <button className="touch-target rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-ink" type="submit">
            <RefreshCcw className="inline h-4 w-4" aria-hidden="true" /> Regenerate
          </button>
        </form>
      </div>
      <section className="grid gap-3">
        {list.items.map((item) => {
          const latest = item.selectedStoreProduct?.priceObservations[0];
          return (
            <Card key={item.id} className="grid gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{item.groceryRequirement.name}</h2>
                  <p className="text-sm text-ink/65">{quantityText(item.requiredQuantity, item.requiredUnit)}</p>
                </div>
                {item.requiresLoyaltyCard ? <Badge tone="brand">Loyalty</Badge> : null}
              </div>
              <div className="grid gap-1 text-sm text-ink/75">
                <p>Product: {item.selectedStoreProduct?.product.canonicalName ?? "No acceptable product selected"}</p>
                <p>Store: {item.store ? `${item.store.chain.name} ${item.store.branchName}` : "Missing"}</p>
                <p>Packs: {item.packsNeeded || "Missing"}</p>
                <p>Price: {priceText(item.effectivePriceCents)} {item.unitPriceCents ? `(${priceText(item.unitPriceCents)} per unit)` : ""}</p>
                <p>Last checked: {item.lastCheckedAt ? item.lastCheckedAt.toLocaleDateString("en-NZ") : "Missing"}</p>
              </div>
              {latest ? <StatusLine ok={!isPriceStale(latest.collectedAt)}>{isPriceStale(latest.collectedAt) ? "Price is stale." : "Price is current."}</StatusLine> : <StatusLine ok={false}>Price missing.</StatusLine>}
              <div className="flex gap-2">
                <form action={toggleShoppingItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="field" value="purchased" />
                  <button className="touch-target rounded-md border border-black/15 px-3 py-2 text-sm" type="submit">{item.purchased ? "Purchased" : "Mark purchased"}</button>
                </form>
                <form action={toggleShoppingItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="field" value="alreadyOwned" />
                  <button className="touch-target rounded-md border border-black/15 px-3 py-2 text-sm" type="submit">{item.alreadyOwned ? "Owned" : "Already owned"}</button>
                </form>
              </div>
            </Card>
          );
        })}
      </section>
      <aside className="sticky bottom-20 rounded-lg border border-black/10 bg-ink p-4 text-white shadow-soft md:bottom-4">
        {[...totalsByStore.entries()].map(([store, cents]) => (
          <p key={store} className="flex justify-between text-sm"><span>{store}</span><strong>{priceText(cents)}</strong></p>
        ))}
        <p className="mt-2 flex justify-between border-t border-white/20 pt-2"><span>Groceries</span><strong>{priceText(list.groceryCents)}</strong></p>
        <p className="flex justify-between text-sm text-white/80"><span>Estimated petrol</span><strong>{priceText(list.fuelCents)}</strong></p>
        <p className="flex justify-between text-lg"><span>Total effective cost</span><strong>{priceText(list.totalCents)}</strong></p>
      </aside>
    </>
  );
}
