import type { FlattenedCatalogItem, OrderLine } from "@/types";

export interface ReorderReview {
  available: Array<{ variantId: string; quantity: number; item: FlattenedCatalogItem }>;
  unavailable: Array<{ label: string; quantity: number; reason: string }>;
}

export function buildReorderReview(lines: readonly OrderLine[], catalog: readonly FlattenedCatalogItem[]): ReorderReview {
  const available: ReorderReview["available"] = [];
  const unavailable: ReorderReview["unavailable"] = [];
  for (const line of lines) {
    const item = catalog.find((entry) => line.variantId ? entry.variantId === line.variantId : entry.item === line.item);
    if (!item || !item.orderable) {
      unavailable.push({ label: `${line.product} ${line.flavor}`.trim(), quantity: line.qty, reason: item?.status === "coming-soon" ? "Coming soon" : "Unavailable" });
      continue;
    }
    available.push({ variantId: item.variantId, quantity: Math.max(1, Math.min(999, Math.floor(line.qty))), item });
  }
  return { available, unavailable };
}

export function reorderQuantities(review: ReorderReview): Record<string, number> {
  return Object.fromEntries(review.available.map((line) => [line.variantId, line.quantity]));
}
