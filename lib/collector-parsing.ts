export function categoryExclusions(needName: string) {
  const name = needName.toLowerCase();
  if (name.includes("sardine")) return ["cat food", "dog food", "pet food", "catfood"];
  if (name.includes("roast chicken")) return ["gravy", "stock", "soup", "seasoning", "flavour", "sachet"];
  if (name.includes("salami stick")) return ["sliced", "pepperoni", "pizza"];
  return [];
}

export function productPrices(text: string) {
  const prices: number[] = [];
  const pattern = /\$\s*(\d{1,4})(?:\.(\d{1,2})|\s+(\d{2})(?!\d))?/g;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const before = text.slice(Math.max(0, start - 12), start).toLowerCase();
    const after = text.slice(start + match[0].length, start + match[0].length + 24).toLowerCase();
    if (/^\s*\/\s*(?:\d|ea|each|kg|g|ml|l\b|litre)/i.test(after)) continue;
    if (/save\s*$/i.test(before) || (/\(\s*$/.test(before) && /^\s*\)/.test(after))) continue;
    const centsText = match[2] ?? match[3] ?? "00";
    const cents = Number(match[1]) * 100 + Number(centsText.padEnd(2, "0"));
    if (cents > 0) prices.push(cents);
  }
  return [...new Set(prices.slice(0, 4))];
}
