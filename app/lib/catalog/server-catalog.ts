import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { readContent } from "@/api/content/store.js";
import { resolveCatalogProductImage } from "@/lib/catalog/image-core";
import { resolveEffectivePrice } from "@/lib/catalog/pricing-core";
import type { CatalogContract, CategorySection, FlattenedCatalogItem, StoreAccount } from "@/types";

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
  map?: string; mapValue?: number; bottle?: string; cardImage?: string; panel?: string; status?: string; available?: boolean;
  description?: string; limitedEdition?: boolean; runningLow?: boolean; galleryImages?: string[];
}
interface RawProduct {
  id?: string; title?: string; category?: string; categorySlug?: string; description?: string;
  bottle?: string; panel?: string; siteImages?: string[]; variants?: RawVariant[];
}
interface RawCatalog { categories?: CategorySection[]; products?: RawProduct[] }
interface VariantOverride {
  status?: string; bottle?: string; panel?: string; images?: string[];
  limitedEdition?: boolean; runningLow?: boolean;
}

export async function loadServerCatalog(): Promise<ServerCatalogItem[]> {
  const raw = JSON.parse(await readFile(path.join(process.cwd(), "public", "catalog-data.json"), "utf8")) as RawCatalog;
  const content = await readContent().catch(() => null) as {
    customProducts?: RawProduct[];
    hiddenVariants?: string[];
    variantOverrides?: Record<string, VariantOverride>;
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

export async function loadPublicCatalog(account?: StoreAccount | null): Promise<CatalogContract> {
  const raw = JSON.parse(await readFile(path.join(process.cwd(), "public", "catalog-data.json"), "utf8")) as RawCatalog;
  const content = await readContent().catch(() => null) as {
    customProducts?: RawProduct[];
    hiddenVariants?: string[];
    variantOverrides?: Record<string, VariantOverride>;
  } | null;
  const products = [...(raw.products || []), ...(content?.customProducts || [])];
  const hidden = new Set(content?.hiddenVariants || []);
  const overrides = content?.variantOverrides || {};
  let sort = 0;
  const items = products.flatMap((product) => (product.variants || []).map((variant) => {
    const variantId = clean(variant.id);
    const override = overrides[variantId] || {};
    const rawStatus = override.status || variant.status || (variant.available === false ? "inactive" : "available");
    const status = rawStatus === "coming-soon" || rawStatus === "inactive" ? rawStatus : "available";
    const image = resolveCatalogProductImage({
      variantOverrideImage: override.bottle,
      variantImage: variant.bottle,
      productImage: product.bottle,
    }) || "";
    const standardWholesalePrice = moneyValue(variant.wholesaleValue, variant.wholesale);
    const effective = resolveEffectivePrice({ productId: clean(product.id), variantId, wholesalePrice: standardWholesalePrice }, account?.priceOverrides || []);
    const panel = clean(override.panel || variant.panel || product.panel);
    const gallerySources = unique([
      image,
      panel,
      ...(override.images || []),
      ...(variant.galleryImages || []),
      ...(product.siteImages || []),
    ]).slice(0, 16);
    const section = sectionFor(product);
    const cardImage = clean(variant.cardImage) || image;
    return {
      id: variantId,
      variantId,
      productId: clean(product.id),
      productTitle: clean(product.title),
      category: clean(product.category),
      categorySlug: clean(product.categorySlug),
      section,
      fullTitle: [clean(product.title), clean(variant.flavor)].filter(Boolean).join(" "),
      productDescription: clean(product.description),
      sort: sort++,
      aliases: flavorAliases(clean(variant.flavor)),
      item: clean(variant.item),
      upc: clean(variant.upc),
      flavor: clean(variant.flavor) || "Unflavored",
      description: clean(variant.description),
      wholesale: money(effective.wholesalePrice),
      wholesaleValue: effective.wholesalePrice,
      map: money(moneyValue(variant.mapValue, variant.map)),
      mapValue: moneyValue(variant.mapValue, variant.map),
      bottle: image,
      cardImage,
      panel,
      available: status === "available" && !hidden.has(variantId),
      status,
      limitedEdition: override.limitedEdition ?? variant.limitedEdition ?? /\b(?:limited|\ble\b)/i.test(clean(variant.description)),
      runningLow: override.runningLow ?? variant.runningLow ?? false,
      galleryImages: gallerySources,
      gallery: gallerySources.map((src) => ({
        src,
        label: src === panel ? "Supplement Facts" : src === image ? `${clean(product.title)} ${clean(variant.flavor)}` : "Product image",
        kind: src === panel ? "facts" as const : src === image ? "product" as const : "gallery" as const,
      })),
      orderable: status === "available" && !hidden.has(variantId),
    } satisfies FlattenedCatalogItem;
  })).filter((item) => item.variantId && item.item && !hidden.has(item.variantId) && item.status !== "inactive");

  return { categories: raw.categories || [], items, authenticated: Boolean(account) };
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

function money(value: number): string { return `$${value.toFixed(2)}`; }
function unique(values: string[]): string[] { return [...new Set(values.map(clean).filter(Boolean))]; }
function sectionFor(product: RawProduct): string {
  const slug = clean(product.categorySlug);
  const text = `${clean(product.title)} ${clean(product.category)}`.toLowerCase();
  if (/creatine|citrulline|beta alanine|\braw\b/.test(text)) return "raws";
  if (slug === "thermogenic") return "thermogenics";
  if (["focus", "pump", "strength", "raws", "thermogenics"].includes(slug)) return slug;
  return "strength";
}
function flavorAliases(flavor: string): string[] {
  const base = flavor.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const aliases = [base, base.replace(/\s+/g, "")];
  if (base.includes("blue") && base.includes("razz")) aliases.push("bluerazz");
  if (base.includes("fruit") && base.includes("punch")) aliases.push("fruitpunch");
  if (base.includes("sour") && base.includes("gummy")) aliases.push("sourgum");
  if (base.includes("strawberry") && base.includes("lemonade")) aliases.push("strawlem");
  if (base.includes("watermelon") && base.includes("lemonade")) aliases.push("waterlem", "watlem");
  if (base.includes("razz") && base.includes("mango")) aliases.push("razzmango");
  if (base.includes("grape") && base.includes("lime")) aliases.push("glr", "grapelime");
  return unique(aliases);
}
