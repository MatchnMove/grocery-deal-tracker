import { Card } from "@/components/ui";
import { CsvImportForm } from "@/components/csv-import-form";
import { csvColumns } from "@/lib/csv-import";

export default function CsvImportPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">CSV Import</h1>
        <p className="text-sm text-ink/65">Validate rows, import valid prices and leave invalid rows untouched.</p>
      </div>
      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Expected columns</h2>
        <p className="text-sm text-ink/65">{csvColumns.join(", ")}</p>
        <a className="text-sm font-semibold text-leaf" href="/samples/example-prices.csv">Download example CSV</a>
      </Card>
      <Card>
        <CsvImportForm />
      </Card>
    </>
  );
}
