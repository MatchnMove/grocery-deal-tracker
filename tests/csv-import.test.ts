import { describe, expect, it } from "vitest";
import { previewCsv } from "../lib/csv-import";

describe("CSV validation", () => {
  it("accepts valid rows and rejects unsupported units", () => {
    const rows = previewCsv(`store,branch,product_name,brand,pack_size,unit,normal_price,loyalty_price,special_start,special_end,product_url,checked_at
Woolworths,Albany,Eggs,,18,each,10.50,,,,,
Woolworths,Albany,Eggs,,18,bucket,10.50,,,,,`);
    expect(rows[0].ok).toBe(true);
    expect(rows[1].ok).toBe(false);
  });
});
