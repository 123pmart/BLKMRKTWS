import type { FlattenedCatalogItem, Order } from "@/types";

export function frequentlyOrderedItems(orders: readonly Order[], catalog: readonly FlattenedCatalogItem[], limit = 4): FlattenedCatalogItem[] {
  const scores = new Map<string, { quantity: number; orders: number }>();
  for (const order of orders) {
    const seen = new Set<string>();
    for (const line of order.lines) {
      const item = catalog.find((entry) => line.variantId ? entry.variantId === line.variantId : entry.item === line.item);
      if (!item?.orderable) continue;
      const score = scores.get(item.variantId) || { quantity: 0, orders: 0 };
      score.quantity += line.qty;
      if (!seen.has(item.variantId)) score.orders += 1;
      scores.set(item.variantId, score); seen.add(item.variantId);
    }
  }
  return [...catalog].filter((item) => scores.has(item.variantId)).sort((a, b) => {
    const left = scores.get(a.variantId)!; const right = scores.get(b.variantId)!;
    return right.orders - left.orders || right.quantity - left.quantity || a.sort - b.sort;
  }).slice(0, limit);
}
