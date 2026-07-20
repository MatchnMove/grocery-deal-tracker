import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-black/10 bg-white p-4 shadow-soft ${className}`}>{children}</section>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "brand" }) {
  const tones = {
    neutral: "bg-black/5 text-ink",
    good: "bg-leaf/10 text-leaf",
    warn: "bg-brass/15 text-ink",
    brand: "bg-berry/10 text-berry"
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function StatusLine({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <p className="flex items-start gap-2 text-sm text-ink/75">
      <Icon className={ok ? "mt-0.5 h-4 w-4 text-leaf" : "mt-0.5 h-4 w-4 text-brass"} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-11 rounded-md border border-black/15 bg-white px-3 py-2 text-base outline-none ring-leaf/20 focus:border-leaf focus:ring-4";
