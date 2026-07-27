import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PRODUCT_KNOWLEDGE } from "@/lib/assistant/knowledge-data";
import type { AssistantProduct, AssistantVariant, ProductKnowledgeBlueprint, ProductKnowledgeOverride } from "@/lib/assistant/types";
import { readContent } from "@/api/content/store.js";
import { resolveEffectivePrice } from "@/lib/catalog/pricing-core";
import { loadServerCatalog } from "@/lib/catalog/server-catalog";
import type { StorePriceOverride } from "@/types";

interface RawVariant {
  id?: string;
  cardImage?: string;
  bottle?: string;
}

interface RawProduct {
  id?: string;
  title?: string;
  handle?: string;
  category?: string;
  categorySlug?: string;
  bottle?: string;
  variants?: RawVariant[];
}

interface RawCatalog {
  products?: RawProduct[];
}

export async function loadAssistantProducts(overrides: StorePriceOverride[] = []): Promise<AssistantProduct[]> {
  const content = await readContent().catch(() => null) as { assistantKnowledge?: ProductKnowledgeOverride[] } | null;
  const [catalog, rawCatalog] = await Promise.all([
    loadServerCatalog(),
    readFile(path.join(process.cwd(), "public", "catalog-data.json"), "utf8").then((raw) => JSON.parse(raw) as RawCatalog),
  ]);
  const rawProducts = rawCatalog.products ?? [];
  const productById = new Map(rawProducts.map((product) => [clean(product.id), product]));
  const cardImages = new Map<string, string>();
  for (const product of rawProducts) {
    for (const variant of product.variants ?? []) {
      cardImages.set(clean(variant.id), clean(variant.cardImage) || clean(variant.bottle) || clean(product.bottle));
    }
  }

  const knowledgeOverrides = new Map((content?.assistantKnowledge ?? []).map((entry) => [entry.productId, entry]));
  return PRODUCT_KNOWLEDGE.map((baseKnowledge) => {
    const knowledge = applyKnowledgeOverride(baseKnowledge, knowledgeOverrides.get(baseKnowledge.productId));
    const rawProduct = productById.get(knowledge.productId);
    const matchingItems = catalog.filter((item) => {
      if (item.productId === knowledge.productId) return true;
      return normalize(item.product) === normalize(rawProduct?.title);
    });
    const variants = matchingItems.map((item): AssistantVariant => {
      const price = resolveEffectivePrice(item, overrides);
      const ownerConfirmedSoldOut = OWNER_CONFIRMED_SOLD_OUT_VARIANTS.has(item.variantId);
      return {
        id: item.variantId,
        productId: item.productId,
        flavor: item.flavor,
        item: item.item,
        upc: item.upc,
        image: cardImages.get(item.variantId) || item.image || clean(rawProduct?.bottle),
        wholesalePrice: price.wholesalePrice,
        standardWholesalePrice: price.standardWholesalePrice,
        mapPrice: item.mapPrice,
        marginPercent: marginPercent(price.wholesalePrice, item.mapPrice),
        status: ownerConfirmedSoldOut || item.hidden || item.status === "inactive"
          ? "sold-out"
          : item.status === "coming-soon"
            ? "coming-soon"
            : "available",
        limited: item.limited,
        runningLow: item.runningLow,
        hidden: item.hidden,
      };
    });
    const firstVisible = variants.find((variant) => !variant.hidden) ?? variants[0];
    return {
      id: knowledge.productId,
      name: clean(rawProduct?.title) || knowledge.shortName,
      shortName: knowledge.shortName,
      slug: clean(rawProduct?.handle) || knowledge.productId,
      category: clean(rawProduct?.category) || "Products",
      categorySlug: clean(rawProduct?.categorySlug) || "products",
      image: firstVisible?.image || clean(rawProduct?.bottle),
      aliases: knowledge.aliases,
      commonMisspellings: knowledge.commonMisspellings ?? [],
      purpose: knowledge.purpose,
      retailerPitch: knowledge.retailerPitch,
      bestFor: knowledge.bestFor,
      notIdealFor: knowledge.notIdealFor,
      keyDifferentiators: knowledge.keyDifferentiators,
      goals: knowledge.goals,
      formula: knowledge.formula,
      relationships: knowledge.relationships,
      approvedFaqs: knowledge.approvedFaqs ?? [],
      prohibitedClaims: knowledge.prohibitedClaims,
      sources: knowledge.sources,
      verification: knowledge.verification,
      variants,
    } satisfies AssistantProduct;
  });
}

const OWNER_CONFIRMED_SOLD_OUT_VARIANTS = new Set([
  "defy-hyper-stimulant-white-gummy-bear-56298",
  "rule-hyper-focus-purge-pop-56299",
]);

function applyKnowledgeOverride(
  base: ProductKnowledgeBlueprint,
  override?: ProductKnowledgeOverride,
): ProductKnowledgeBlueprint {
  if (!override) return base;
  return {
    ...base,
    ...definedFields(override),
    productId: base.productId,
    formula: override.formula ? { ...base.formula, ...override.formula } : base.formula,
    relationships: override.relationships ? { ...base.relationships, ...override.relationships } : base.relationships,
    sources: [
      ...base.sources,
      {
        id: `${base.productId}:admin`,
        type: "admin-entry",
        location: "blackmarket/content.json#assistantKnowledge",
        note: `Updated by ${override.updatedBy || "an admin"}${override.updatedAt ? ` on ${override.updatedAt}` : ""}.`,
      },
    ],
  };
}

function definedFields<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function marginPercent(wholesale: number, map: number): number {
  if (map <= 0) return 0;
  return Math.round(((map - wholesale) / map) * 10_000) / 100;
}
