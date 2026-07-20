"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { importCsvPricesAction } from "@/lib/actions/prices";

type PreviewRow =
  | {
      rowNumber: number;
      ok: true;
      value: {
        store: string;
        branch: string;
        productName: string;
        normalPriceCents: number;
        loyaltyPriceCents: number | null;
        checkedAt: string;
      };
    }
  | { rowNumber: number; ok: false; errors: string[] };

export function CsvImportForm() {
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const validCount = rows.filter((row) => row.ok).length;
  const invalidCount = rows.length - validCount;

  async function preview() {
    setError(null);
    const response = await fetch("/api/prices/csv/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv })
    });
    const result = (await response.json()) as { rows?: PreviewRow[]; error?: string };
    if (!response.ok) {
      setError(result.error ?? "CSV preview failed");
      return;
    }
    setRows(result.rows ?? []);
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        <span>CSV content</span>
        <textarea className="min-h-64 rounded-md border border-black/15 p-3 font-mono text-sm" name="csv" value={csv} onChange={(event) => setCsv(event.target.value)} required />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="touch-target rounded-md border border-black/15 bg-white px-4 py-2 font-semibold text-ink" type="button" onClick={preview}>
          Preview rows
        </button>
        <form action={importCsvPricesAction}>
          <input type="hidden" name="csv" value={csv} />
          <button className="touch-target rounded-md bg-leaf px-4 py-2 font-semibold text-white" type="submit" disabled={validCount === 0}>
            Import valid rows
          </button>
        </form>
      </div>
      {error ? <p className="rounded-md bg-berry/10 p-3 text-sm text-berry">{error}</p> : null}
      {rows.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm text-ink/65">{validCount} valid rows, {invalidCount} rows with errors.</p>
          <div className="overflow-x-auto rounded-md border border-black/10">
            <table className="min-w-full divide-y divide-black/10 text-sm">
              <thead className="bg-market text-left">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 bg-white">
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      {row.ok ? <CheckCircle2 className="h-5 w-5 text-leaf" aria-label="Valid" /> : <AlertTriangle className="h-5 w-5 text-brass" aria-label="Invalid" />}
                    </td>
                    <td className="px-3 py-2">
                      {row.ok
                        ? `${row.value.store} ${row.value.branch}: ${row.value.productName} $${(row.value.normalPriceCents / 100).toFixed(2)}`
                        : row.errors.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
