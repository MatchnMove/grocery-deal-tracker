"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Beef, Home, ListChecks, MoreHorizontal, Store } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/shopping", label: "Shopping", icon: ListChecks },
  { href: "/meals", label: "Meals", icon: Beef },
  { href: "/prices", label: "Prices", icon: BarChart3 },
  { href: "/settings", label: "More", icon: MoreHorizontal }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur safe-bottom md:hidden" aria-label="Primary">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon === MoreHorizontal && pathname.startsWith("/stores") ? Store : item.icon;
          return (
            <Link key={item.href} href={item.href} className={`touch-target flex flex-col items-center justify-center gap-1 py-2 text-xs ${active ? "text-leaf" : "text-ink/60"}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
