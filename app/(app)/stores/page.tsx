import { Card, Field, inputClass } from "@/components/ui";
import { saveStoreAction } from "@/lib/actions/stores";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { returnFuelCostCents } from "@/lib/route-optimisation";
import { priceText } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const user = await requireUser();
  const [stores, chains, settings] = await Promise.all([
    prisma.store.findMany({ where: { userId: user.id }, include: { chain: true }, orderBy: [{ chain: { name: "asc" } }, { branchName: "asc" }] }),
    prisma.supermarketChain.findMany({ orderBy: { name: "asc" } }),
    prisma.userSettings.findUnique({ where: { userId: user.id } })
  ]);
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Stores</h1>
        <p className="text-sm text-ink/65">Branch distances are editable placeholders until routing is connected.</p>
      </div>
      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Add Branch</h2>
        <form action={saveStoreAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Chain"><select className={inputClass} name="chainId">{chains.map((chain) => <option key={chain.id} value={chain.id}>{chain.name}</option>)}</select></Field>
          <Field label="Branch name"><input className={inputClass} name="branchName" required /></Field>
          <Field label="Address"><input className={inputClass} name="address" required /></Field>
          <Field label="One-way km"><input className={inputClass} name="oneWayDistanceKm" type="number" step="0.1" /></Field>
          <Field label="Travel minutes"><input className={inputClass} name="estimatedTravelMinutes" type="number" /></Field>
          <Field label="Direction notes"><input className={inputClass} name="directionNotes" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" value="true" defaultChecked /> Active</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="insidePreferredArea" value="true" defaultChecked /> Preferred direction</label>
          <button className="touch-target rounded-md bg-leaf px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">Save branch</button>
        </form>
      </Card>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => {
          const fuel = store.oneWayDistanceKm && settings ? returnFuelCostCents(store.oneWayDistanceKm, settings.fuelEconomyLitresPer100Km, settings.fuelPriceCentsPerLitre) : null;
          return (
            <Card key={store.id}>
              <h2 className="font-semibold">{store.chain.name} {store.branchName}</h2>
              <p className="text-sm text-ink/65">{store.address}</p>
              <p className="mt-2 text-sm">Distance: {store.oneWayDistanceKm?.toString() ?? "Needs verification"} km</p>
              <p className="text-sm">Fuel return estimate: {fuel == null ? "Needs distance" : priceText(fuel)}</p>
              <p className="text-xs text-berry">{store.requiresVerification ? "Requires verification" : "Verified"}</p>
            </Card>
          );
        })}
      </section>
    </>
  );
}
