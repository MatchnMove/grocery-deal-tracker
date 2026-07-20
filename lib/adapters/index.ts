import { csvImportAdapter } from "./csv";
import { manualPriceAdapter } from "./manual";
import { newWorldAdapter, paknsaveAdapter, woolworthsAdapter } from "./placeholders";

export const priceSourceAdapters = {
  manual: manualPriceAdapter,
  "csv-import": csvImportAdapter,
  woolworths: woolworthsAdapter,
  paknsave: paknsaveAdapter,
  "new-world": newWorldAdapter
};

export type PriceSourceAdapterKey = keyof typeof priceSourceAdapters;
