import type { PriceSourceAdapter } from "./types";

export const manualPriceAdapter: PriceSourceAdapter = {
  sourceName: "Manual price entry",
  supportsStore() {
    return true;
  },
  async searchProducts() {
    return [];
  },
  async fetchProductPrice() {
    throw new Error("Manual prices are entered through the admin interface, not fetched automatically.");
  }
};
