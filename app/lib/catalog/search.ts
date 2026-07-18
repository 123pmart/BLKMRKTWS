import type { FlattenedCatalogItem } from "@/types";

export function normalizeCatalogSearch(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function searchCatalogItems<T extends FlattenedCatalogItem>(items: readonly T[], query: string): T[] {
  const normalized = normalizeCatalogSearch(query);
  if (!normalized) return [...items];
  const tokens = normalized.split(" ").filter(Boolean);
  return items
    .map((item, index) => ({ item, index, rank: rank(item, normalized, tokens) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => a.rank - b.rank || a.item.sort - b.item.sort || a.index - b.index)
    .map((entry) => entry.item);
}

function rank(item: FlattenedCatalogItem, query: string, tokens: string[]): number {
  const product = normalizeCatalogSearch(item.productTitle);
  const flavor = normalizeCatalogSearch(item.flavor);
  const sku = normalizeCatalogSearch(item.item);
  const upc = normalizeCatalogSearch(item.upc);
  const category = normalizeCatalogSearch(`${item.category} ${item.categorySlug} ${item.section}`);
  const aliases = item.aliases.map(normalizeCatalogSearch).join(" ");
  const haystack = normalizeCatalogSearch(`${product} ${flavor} ${sku} ${upc} ${category} ${aliases} ${item.fullTitle} ${item.description || ""}`);
  if (!tokens.every((token) => haystack.includes(token))) return Number.POSITIVE_INFINITY;
  if (sku === query || upc === query) return 0;
  if (product === query) return 5;
  if (flavor === query) return 8;
  if (product.startsWith(query)) return 12;
  if (flavor.startsWith(query)) return 16;
  if (sku.startsWith(query) || upc.startsWith(query)) return 20;
  if (item.aliases.some((alias) => normalizeCatalogSearch(alias) === query)) return 24;
  if (category.includes(query)) return 32;
  if (haystack.includes(query)) return 40;
  return 50;
}
