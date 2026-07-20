import { chromium, type Page } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { categoryExclusions, productPrices } from "../lib/collector-parsing";

type Unit = "EACH" | "PACK" | "TIN" | "JAR" | "LOAF" | "GRAM" | "KILOGRAM" | "MILLILITRE" | "LITRE";
type Job = {
  runId: string;
  stores: { id: string; branchName: string; address: string; chain: string }[];
  requirements: { id: string; name: string; requiredQuantity: number; requiredUnit: Unit; acceptableTerms: string[]; excludedTerms: string[] }[];
};
type Result = { storeId: string; requirementId: string; name: string; packageQuantity: number; packageUnit: Unit; normalPriceCents: number; loyaltyPriceCents?: number | null; productUrl: string; collectedAt: string; confidence: number };

const appUrl = process.env.COLLECTOR_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
const secret = process.env.COLLECTOR_SECRET ?? process.env.CRON_SECRET;
const pollSeconds = Number(process.env.COLLECTOR_POLL_SECONDS ?? "20");
if (!appUrl || !secret) throw new Error("Set COLLECTOR_APP_URL and COLLECTOR_SECRET before starting the collector.");

const retailerUrls: Record<string, (query: string) => string> = {
  woolworths: (query) => `https://www.woolworths.co.nz/shop/searchproducts?search=${encodeURIComponent(query)}`,
  paknsave: (query) => `https://www.paknsave.co.nz/shop/search?q=${encodeURIComponent(query)}`,
  "new-world": (query) => `https://www.newworld.co.nz/shop/search?q=${encodeURIComponent(query)}`
};

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function packageDetails(text: string, requiredUnit: Unit) {
  const lower = text.toLowerCase();
  const match = lower.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|litres|pack|pk|each|ea|dozen|tin|jar|loaf)(?:\b|$)/i);
  if (requiredUnit === "EACH" && /egg/.test(lower)) {
    const count = lower.match(/(?:^|\s)(\d{1,2})\s*(?:pack|pk|eggs?|each|ea)(?:\b|$)/i);
    if (count) return { quantity: Number(count[1]), unit: "EACH" as Unit };
    if (/dozen/.test(lower)) return { quantity: 12, unit: "EACH" as Unit };
  }
  // PACK/TIN/JAR/LOAF/EACH describe how the grocery list buys an item. Retailers
  // normally label those products by their net weight (for example, a 106g tin or
  // a 700g loaf). That weight must not make the product incompatible with its list
  // unit. Only mass and volume requirements need physical-unit conversion.
  if (["PACK", "TIN", "JAR", "LOAF", "EACH"].includes(requiredUnit)) {
    const count = lower.match(/(?:^|\s)(\d{1,2})\s*(?:pack|pk|each|ea)(?:\b|$)/i);
    return { quantity: count ? Number(count[1]) : 1, unit: requiredUnit };
  }
  if (!match) return { quantity: 1, unit: requiredUnit };
  const quantity = Number(match[1]);
  const raw = match[2].toLowerCase();
  const units: Record<string, Unit> = { kg: "KILOGRAM", g: "GRAM", ml: "MILLILITRE", l: "LITRE", litre: "LITRE", litres: "LITRE", pack: "PACK", pk: "PACK", each: "EACH", ea: "EACH", tin: "TIN", jar: "JAR", loaf: "LOAF" };
  return raw === "dozen" ? { quantity: 12, unit: "EACH" as Unit } : { quantity, unit: units[raw] ?? requiredUnit };
}

function comparable(required: Unit, actual: Unit) {
  return required === actual || ([required, actual].every((unit) => unit === "GRAM" || unit === "KILOGRAM")) || ([required, actual].every((unit) => unit === "MILLILITRE" || unit === "LITRE"));
}

async function scrape(page: Page, store: Job["stores"][number], need: Job["requirements"][number]): Promise<Result | null> {
  const makeUrl = retailerUrls[store.chain];
  if (!makeUrl) return null;
  await page.goto(makeUrl(need.name), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);
  // Keep this callback self-contained and free of nested functions. The collector
  // runs through tsx/esbuild, whose helper functions are unavailable inside the
  // isolated browser execution context used by Playwright.
  const candidates = await page.locator('article, [data-testid*="product" i], [class*="product-card" i], [class*="productcard" i], [class*="product-tile" i], [class*="producttile" i], a[href]').evaluateAll((nodes) => {
    const found: Record<string, string> = {};
    for (const node of nodes) {
      const anchor = (node.matches('a[href]') ? node : node.querySelector('a[href]')) as HTMLAnchorElement | null;
      const href = anchor?.href ?? "";
      if (!href || /^(?:javascript:|about:)/i.test(href)) continue;
      let container: Element | null = node.matches('a[href]') ? node : node;
      for (let depth = 0; container && depth < 7; depth += 1) {
        const text = (container.textContent ?? "").replace(/\s+/g, " ").trim();
        if (/\$\s*\d/.test(text) && text.length <= 1200 && (!found[href] || text.length < found[href].length)) {
          found[href] = text;
        }
        container = container.parentElement;
      }
    }
    return Object.entries(found).slice(0, 120).map(([href, text]) => ({ href, text }));
  });
  const ranked = candidates.flatMap((candidate) => {
    const lower = candidate.text.toLowerCase();
    if (need.excludedTerms.length && includesAny(lower, need.excludedTerms)) return [];
    if (includesAny(lower, categoryExclusions(need.name))) return [];
    if (need.acceptableTerms.length && !includesAny(lower, need.acceptableTerms)) return [];
    const prices = productPrices(candidate.text);
    if (!prices.length) return [];
    const pack = packageDetails(candidate.text, need.requiredUnit);
    if (!comparable(need.requiredUnit, pack.unit)) return [];
    const uniquePrices = [...new Set(prices.slice(0, 3))];
    const cheapest = Math.min(...uniquePrices);
    const normal = Math.max(...uniquePrices);
    const multiplier = need.requiredUnit === "KILOGRAM" && pack.unit === "GRAM" ? 1000 : need.requiredUnit === "GRAM" && pack.unit === "KILOGRAM" ? 0.001 : need.requiredUnit === "LITRE" && pack.unit === "MILLILITRE" ? 1000 : need.requiredUnit === "MILLILITRE" && pack.unit === "LITRE" ? 0.001 : 1;
    const packs = Math.ceil((need.requiredQuantity * multiplier) / pack.quantity);
    return [{ candidate, pack, normal, loyalty: cheapest < normal ? cheapest : null, total: cheapest * packs }];
  }).sort((a, b) => a.total - b.total);
  const best = ranked[0];
  if (!best) {
    console.warn(`${store.chain} ${store.branchName} / ${need.name}: found ${candidates.length} product cards, 0 acceptable priced matches`);
    return null;
  }
  console.log(`${store.chain} ${store.branchName} / ${need.name}: ${best.candidate.text.slice(0, 100)} ($${(best.loyalty ?? best.normal) / 100})`);
  return { storeId: store.id, requirementId: need.id, name: best.candidate.text.slice(0, 280), packageQuantity: best.pack.quantity, packageUnit: best.pack.unit, normalPriceCents: best.normal, loyaltyPriceCents: best.loyalty, productUrl: best.candidate.href, collectedAt: new Date().toISOString(), confidence: 0.7 };
}

async function getJob(): Promise<Job | null> {
  const response = await fetch(`${appUrl!.replace(/\/$/, "")}/api/internal/collector/jobs`, { headers: { "x-collector-secret": secret! } });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Job request failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<Job>;
}

async function runJob(job: Job, page: Page) {
  const results: Result[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  for (const store of job.stores) {
    for (const need of job.requirements) {
      try {
        const result = await scrape(page, store, need);
        if (result) results.push(result); else warnings.push(`${store.chain} ${store.branchName}: no acceptable ${need.name} result`);
      } catch (error) {
        errors.push(`${store.chain} ${need.name}: ${error instanceof Error ? error.message : "collection failed"}`);
      }
      await page.waitForTimeout(1200);
    }
  }
  const response = await fetch(`${appUrl!.replace(/\/$/, "")}/api/internal/collector/jobs`, { method: "POST", headers: { "content-type": "application/json", "x-collector-secret": secret! }, body: JSON.stringify({ runId: job.runId, results, warnings, errors }) });
  if (!response.ok) throw new Error(`Submission failed: ${response.status} ${await response.text()}`);
  console.log(`Collection complete: ${results.length} prices submitted.`);
}

async function main() {
  const profile = path.resolve(process.env.COLLECTOR_PROFILE_DIR ?? ".collector-profile");
  await mkdir(profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, { channel: "chrome", headless: false, viewport: { width: 1360, height: 900 } });
  const page = context.pages()[0] ?? await context.newPage();
  console.log("Desktop collector is running. Keep this window open; complete retailer login, store selection, or CAPTCHA prompts when shown.");
  while (true) {
    try { const job = await getJob(); if (job) await runJob(job, page); } catch (error) { console.error(error instanceof Error ? error.message : error); }
    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
