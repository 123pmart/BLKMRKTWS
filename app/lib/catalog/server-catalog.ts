import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { readContent } from "@/api/content/store.js";
import { resolveCatalogProductImage } from "@/lib/catalog/image-core";

export interface ServerCatalogItem {
  productId: string;
  variantId: string;
  product: string;
  flavor: string;
  item: string;
  upc: string;
  wholesalePrice: number;
  mapPrice: number;
  image: string;
  status: "available" | "coming-soon" | "inactive";
  hidden: boolean;
}

interface RawVariant {
  id?: string; item?: string; upc?: string; flavor?: string; wholesale?: string; wholesaleValue?: number;
  map?: string; mapValue?: number; bottle?: string; status?: string; available?: boolean;
}
interface RawProduct { id?: string; title?: string; bottle?: string; variants?: RawVariant[] }
interface RawCatalog { products?: RawProduct[] }

export async function loadServerCatalog(): Promise<ServerCatalogItem[]> {
  const raw = JSON.parse(await readFile(path.join(process.cwd(), "public", "catalog-data.json"), "utf8")) as RawCatalog;
  const content = await readContent().catch(() => null) as {
    customProducts?: RawProduct[];
    hiddenVariants?: string[];
    variantOverrides?: Record<string, { status?: string; bottle?: string }>;
  } | null;
  const products = [...(raw.products || []), ...(content?.customProducts || [])];
  const hidden = new Set(content?.hiddenVariants || []);
  const overrides = content?.variantOverrides || {};

  return products.flatMap((product) => (product.variants || []).map((variant) => {
    const variantId = clean(variant.id);
    const override = overrides[variantId] || {};
    const rawStatus = override.status || variant.status || (variant.available === false ? "inactive" : "available");
    const status = rawStatus === "coming-soon" || rawStatus === "inactive" ? rawStatus : "available";
    return {
      productId: clean(product.id),
      variantId,
      product: clean(product.title),
      flavor: clean(variant.flavor),
      item: clean(variant.item),
      upc: clean(variant.upc),
      wholesalePrice: moneyValue(variant.wholesaleValue, variant.wholesale),
      mapPrice: moneyValue(variant.mapValue, variant.map),
      image: resolveCatalogProductImage({
        variantOverrideImage: override.bottle,
        variantImage: variant.bottle,
        productImage: product.bottle,
      }) || "",
      status,
      hidden: hidden.has(variantId),
    } satisfies ServerCatalogItem;
  })).filter((item) => item.variantId && item.item && item.wholesalePrice >= 0);
}

function moneyValue(numeric: unknown, formatted: unknown): number {
  const direct = Number(numeric);
  if (Number.isFinite(direct)) return Math.round(direct * 100) / 100;
  const parsed = Number(String(formatted || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}
