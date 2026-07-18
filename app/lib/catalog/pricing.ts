import "server-only";

import { getAccountById } from "@/lib/account/account-store";
import { resolveEffectivePrice } from "@/lib/catalog/pricing-core";
import { loadServerCatalog } from "@/lib/catalog/server-catalog";
import type { StoreAccount, StoreIdentity, StorePriceOverride } from "@/types";
import { isSalespersonId, normalizeSalesperson } from "@/lib/salespeople";

export interface RepricedOrderPayload {
  storeId?: string;
  salesperson: "parker" | "matt" | "beau";
  store: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
  totals: {
    units: number;
    wholesale: number;
    map: number;
    subtotal: number;
    discount: number;
    grandTotal: number;
  };
}

export class InvalidOrderPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderPricingError";
  }
}

export async function repriceOrderPayload(payload: Record<string, unknown>, identity: StoreIdentity | null, verifiedAccount?: StoreAccount | null): Promise<RepricedOrderPayload> {
  const catalog = await loadServerCatalog();
  const account = identity && identity.status !== "disabled" ? verifiedAccount || await getAccountById(identity.accountId) : null;
  const overrides = account?.priceOverrides || [];
  const requested = Array.isArray(payload.lines) ? payload.lines : [];
  if (!requested.length) throw new InvalidOrderPricingError("Order must include at least one item.");

  const lines = requested.map((raw, index) => {
    const line = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const variantId = clean(line.variantId);
    const sku = clean(line.item);
    const item = catalog.find((entry) => variantId ? entry.variantId === variantId : entry.item === sku);
    if (!item || item.hidden || item.status !== "available") {
      throw new InvalidOrderPricingError(`Item ${index + 1} is unavailable or no longer orderable.`);
    }
    const quantity = Math.floor(Number(line.qty));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
      throw new InvalidOrderPricingError(`Item ${index + 1} has an invalid quantity.`);
    }
    const price = resolveEffectivePrice(item, overrides);
    return {
      productId: item.productId,
      variantId: item.variantId,
      product: item.product,
      flavor: item.flavor,
      item: item.item,
      upc: item.upc,
      image: item.image,
      wholesale: money(price.wholesalePrice),
      map: money(item.mapPrice),
      qty: quantity,
      standardWholesale: price.standardWholesalePrice,
      customPriceApplied: price.customPriceApplied,
      lineWholesale: cents(price.wholesalePrice * quantity),
      lineMap: cents(item.mapPrice * quantity),
    };
  });

  const totals = lines.reduce((sum, line) => {
    sum.units += line.qty;
    sum.wholesale += line.lineWholesale;
    sum.map += line.lineMap;
    sum.subtotal += cents(line.standardWholesale * line.qty);
    return sum;
  }, { units: 0, wholesale: 0, map: 0, subtotal: 0 });
  const discount = cents(Math.max(0, totals.subtotal - totals.wholesale));

  const submittedStore = payload.store && typeof payload.store === "object" ? payload.store as Record<string, unknown> : {};
  const salesperson = account ? normalizeSalesperson(account.store.salesperson) : submittedStore.salesperson;
  if (!isSalespersonId(salesperson)) throw new InvalidOrderPricingError("Select a salesperson.");
  return {
    ...(account ? { storeId: account.storeId } : {}),
    salesperson,
    store: { ...submittedStore, salesperson },
    lines,
    totals: {
      units: totals.units,
      wholesale: cents(totals.wholesale),
      map: cents(totals.map),
      subtotal: cents(totals.subtotal),
      discount,
      grandTotal: cents(totals.wholesale),
    },
  };
}

export async function effectivePricingForIdentity(identity: StoreIdentity): Promise<{ overrides: StorePriceOverride[] }> {
  if (identity.status === "disabled") return { overrides: [] };
  const account = await getAccountById(identity.accountId);
  return { overrides: account?.priceOverrides || [] };
}

export function normalizePriceOverride(input: Partial<StorePriceOverride>, storeId: string): StorePriceOverride {
  const now = new Date().toISOString();
  const productId = clean(input.productId);
  const variantId = clean(input.variantId);
  const wholesalePrice = cents(Number(input.wholesalePrice));
  if ((!productId && !variantId) || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || wholesalePrice > 100_000) {
    throw new Error("Select a product or variant and enter a valid wholesale price.");
  }
  return {
    id: clean(input.id) || `price_${crypto.randomUUID()}`,
    storeId,
    ...(productId ? { productId } : {}),
    ...(variantId ? { variantId } : {}),
    wholesalePrice,
    createdAt: clean(input.createdAt) || now,
    updatedAt: now,
  };
}

function clean(value: unknown): string { return String(value ?? "").trim(); }
function cents(value: number): number { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function money(value: number): string { return `$${cents(value).toFixed(2)}`; }
