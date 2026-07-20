import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { InstallGuide } from "@/components/install-guide";
import { requireUser } from "@/lib/auth";

const desktopLinks = [
  ["Dashboard", "/dashboard"],
  ["Shopping", "/shopping"],
  ["Meals", "/meals"],
  ["Prices", "/prices"],
  ["History", "/prices/history"],
  ["Stores", "/stores"],
  ["Settings", "/settings"]
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-market/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="font-semibold text-ink">Grocery Deal Tracker</Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {desktopLinks.map(([label, href]) => (
              <Link key={href} className="rounded-md px-3 py-2 text-sm text-ink/75 hover:bg-white" href={href}>{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <InstallGuide />
            <form action="/api/auth/logout" method="post">
              <button className="touch-target rounded-md border border-black/15 px-3 py-2 text-sm font-semibold text-ink" type="submit">Logout</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5">
        <p className="sr-only">Signed in as {user.email}</p>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
