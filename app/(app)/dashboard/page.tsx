import { AlertTriangle, CalendarDays, ListChecks, PiggyBank, Store } from "lucide-react";
import Link from "next/link";
import { Card, StatusLine } from "@/components/ui";
import { getDashboardSnapshot, priceText } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const snapshot = await getDashboardSnapshot(user.id);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink/65">Weekly plan, current prices and store recommendation.</p>
        </div>
        <Link href="/shopping" className="touch-target rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white">Shopping</Link>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<PiggyBank />} label="Weekly cost" value={priceText(snapshot.weeklyCost)} />
        <Metric icon={<CalendarDays />} label="Monthly estimate" value={priceText(snapshot.monthlyCost)} />
        <Metric icon={<Store />} label="Recommended stops" value={String(snapshot.recommendedStops || "Needs prices")} />
        <Metric icon={<ListChecks />} label="Missing prices" value={String(snapshot.missingPrices)} />
      </section>
      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Price collection</h2>
        <StatusLine ok={false}>{snapshot.autoCollectionStatus}</StatusLine>
        <StatusLine ok={!snapshot.hasStalePrices}>
          {snapshot.lastPriceUpdate ? `Last price update: ${snapshot.lastPriceUpdate.toLocaleString("en-NZ")}` : "No price observations have been entered yet."}
        </StatusLine>
        {snapshot.missingPrices > 0 ? (
          <p className="flex gap-2 rounded-md bg-brass/15 p-3 text-sm text-ink">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            Add manual prices or import a CSV before the app can recommend cheapest stores.
          </p>
        ) : null}
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink href="/prices" title="Update Prices" body="Add manual prices, import CSV files and check source status." />
        <QuickLink href="/stores" title="Check Stores" body="Edit branch distances and preferred travel direction." />
      </div>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-leaf/10 text-leaf">{icon}</span>
        <div>
          <p className="text-sm text-ink/60">{label}</p>
          <p className="text-xl font-semibold text-ink">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-lg border border-black/10 bg-white p-4 shadow-soft">
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink/65">{body}</p>
    </Link>
  );
}
