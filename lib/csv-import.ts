import { parse } from "csv-parse/sync";
import { z } from "zod";
import { dollarsToCents } from "./money";
import { normaliseUnit } from "./units";

export const csvColumns = [
  "store",
  "branch",
  "product_name",
  "brand",
  "pack_size",
  "unit",
  "normal_price",
  "loyalty_price",
  "special_start",
  "special_end",
  "product_url",
  "checked_at"
];

const rowSchema = z.object({
  store: z.string().min(1),
  branch: z.string().min(1),
  product_name: z.string().min(1),
  brand: z.string().optional().default(""),
  pack_size: z.string().min(1),
  unit: z.string().min(1),
  normal_price: z.string().min(1),
  loyalty_price: z.string().optional().default(""),
  special_start: z.string().optional().default(""),
  special_end: z.string().optional().default(""),
  product_url: z.string().optional().default(""),
  checked_at: z.string().optional().default("")
});

export type CsvPreviewRow =
  | { rowNumber: number; ok: true; value: ReturnType<typeof parsePriceRow> }
  | { rowNumber: number; ok: false; errors: string[] };

export function parsePriceRow(row: z.infer<typeof rowSchema>) {
  const unit = normaliseUnit(row.unit);
  if (!unit) throw new Error(`Unsupported unit: ${row.unit}`);
  const packSize = Number(row.pack_size);
  if (!Number.isFinite(packSize) || packSize <= 0) throw new Error("Pack size must be greater than zero");
  const normalPriceCents = dollarsToCents(row.normal_price);
  const loyaltyPriceCents = row.loyalty_price ? dollarsToCents(row.loyalty_price) : null;
  if (loyaltyPriceCents != null && loyaltyPriceCents > normalPriceCents) {
    throw new Error("Loyalty price cannot be higher than normal price");
  }
  return {
    store: row.store.trim(),
    branch: row.branch.trim(),
    productName: row.product_name.trim(),
    brand: row.brand.trim() || null,
    packSize,
    unit,
    normalPriceCents,
    loyaltyPriceCents,
    specialStart: row.special_start ? new Date(row.special_start) : null,
    specialEnd: row.special_end ? new Date(row.special_end) : null,
    productUrl: row.product_url.trim() || null,
    checkedAt: row.checked_at ? new Date(row.checked_at) : new Date()
  };
}

export function previewCsv(input: string): CsvPreviewRow[] {
  const records = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    max_record_size: 16_384
  }) as unknown[];
  return records.map((record, index) => {
    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) {
      return { rowNumber: index + 2, ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
    }
    try {
      return { rowNumber: index + 2, ok: true, value: parsePriceRow(parsed.data) };
    } catch (error) {
      return { rowNumber: index + 2, ok: false, errors: [error instanceof Error ? error.message : "Invalid row"] };
    }
  });
}
