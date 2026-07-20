import type { PriceSourceAdapter } from "./types";

export const csvImportAdapter: PriceSourceAdapter = {
  sourceName: "CSV import",
  supportsStore() {
    return true;
  },
  async searchProducts() {
    return [];
  },
  async fetchProductPrice() {
    throw new Error("CSV prices are imported from uploaded files, not fetched automatically.");
  }
};
