import type { StorePriceOverride } from "@/types";

export interface PriceableCatalogItem {
  productId: string;
  variantId: string;
  wholesalePrice: number;
}

export interface EffectivePrice {
  wholesalePrice: number;
  standardWholesalePrice: number;
  customPriceApplied: boolean;
  source: "variant" | "product" | "standard";
}

export function resolveEffectivePrice(item: PriceableCatalogItem, overrides: StorePriceOverride[] = []): EffectivePrice {
  const variant = overrides.find((entry) => entry.variantId === item.variantId);
  const product = overrides.find((entry) => !entry.variantId && entry.productId === item.productId);
  const selected = variant || product;
  return {
    wholesalePrice: selected ? cents(selected.wholesalePrice) : cents(item.wholesalePrice),
    standardWholesalePrice: cents(item.wholesalePrice),
    customPriceApplied: Boolean(selected),
    source: variant ? "variant" : product ? "product" : "standard",
  };
}

function cents(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
