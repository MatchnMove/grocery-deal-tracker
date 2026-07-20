import type { Store } from "@prisma/client";
import type { PriceSourceAdapter } from "./types";

function disabledAdapter(sourceName: string, supportedChain: string): PriceSourceAdapter {
  return {
    sourceName,
    supportsStore(store: Store) {
      return store.chainId.length > 0 && sourceName.toLowerCase().includes(supportedChain);
    },
    async searchProducts() {
      throw new Error(`${sourceName} is disabled until a compliant, documented data source is configured.`);
    },
    async fetchProductPrice() {
      throw new Error(`${sourceName} is disabled until a compliant, documented data source is configured.`);
    }
  };
}

export const woolworthsAdapter = disabledAdapter("Woolworths future integration", "woolworths");
export const paknsaveAdapter = disabledAdapter("PAK'nSAVE future integration", "pak");
export const newWorldAdapter = disabledAdapter("New World future integration", "new world");
