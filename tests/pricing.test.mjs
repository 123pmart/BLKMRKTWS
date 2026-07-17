import test from "node:test";
import assert from "node:assert/strict";

import { resolveEffectivePrice } from "../app/lib/catalog/pricing-core.ts";

const item = { productId: "product-a", variantId: "variant-a", wholesalePrice: 24 };
const base = { id: "price", storeId: "store-a", createdAt: "2026-01-01", updatedAt: "2026-01-01" };

test("variant pricing overrides product pricing", () => {
  const result = resolveEffectivePrice(item, [
    { ...base, id: "product", productId: "product-a", wholesalePrice: 22 },
    { ...base, id: "variant", productId: "product-a", variantId: "variant-a", wholesalePrice: 19.5 },
  ]);
  assert.deepEqual(result, { wholesalePrice: 19.5, standardWholesalePrice: 24, customPriceApplied: true, source: "variant" });
});

test("product pricing applies when no variant override exists", () => {
  assert.equal(resolveEffectivePrice(item, [{ ...base, productId: "product-a", wholesalePrice: 21 }]).wholesalePrice, 21);
});

test("standard wholesale is the fallback", () => {
  assert.deepEqual(resolveEffectivePrice(item, []), { wholesalePrice: 24, standardWholesalePrice: 24, customPriceApplied: false, source: "standard" });
});
