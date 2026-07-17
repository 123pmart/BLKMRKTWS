import assert from "node:assert/strict";
import test from "node:test";

import {
  isTrustedCatalogImageSource,
  resolveCatalogProductImage,
  resolveOrderLineImage,
  trustedCatalogImageUrl,
} from "../app/lib/catalog/image-core.ts";

test("variant override image takes catalog precedence", () => {
  assert.equal(resolveCatalogProductImage({
    variantOverrideImage: "/assets/override.png",
    variantImage: "/assets/variant.png",
    productImage: "/assets/product.png",
  }), "/assets/override.png");
});

test("variant and product image fallbacks are deterministic", () => {
  assert.equal(resolveCatalogProductImage({ variantImage: "/assets/variant.png", productImage: "/assets/product.png" }), "/assets/variant.png");
  assert.equal(resolveCatalogProductImage({ variantImage: "https://example.com/untrusted.png", productImage: "/assets/product.png" }), "/assets/product.png");
});

test("old order lines resolve by stable catalog identifiers", () => {
  const catalog = [{ variantId: "variant-1", productId: "product-1", item: "1001", image: "/assets/variant.png" }];
  assert.equal(resolveOrderLineImage({ variantId: "variant-1" }, catalog), "/assets/variant.png");
  assert.equal(resolveOrderLineImage({ item: "1001" }, catalog), "/assets/variant.png");
});

test("trusted PDF image handling rejects arbitrary and traversal URLs", () => {
  assert.equal(isTrustedCatalogImageSource("/assets/products/bottle.png"), true);
  assert.equal(isTrustedCatalogImageSource("https://store.public.blob.vercel-storage.com/blackmarket/bottle.png"), true);
  assert.equal(isTrustedCatalogImageSource("https://example.com/bottle.png"), false);
  assert.equal(isTrustedCatalogImageSource("/assets/../secrets.txt"), false);
  assert.equal(isTrustedCatalogImageSource("data:image/png;base64,abc"), false);
});

test("trusted static images can use a validated deployment origin", () => {
  assert.equal(
    trustedCatalogImageUrl("/assets/products/example bottle.png", "https://wholesale.example.com/account/orders/1"),
    "https://wholesale.example.com/assets/products/example%20bottle.png",
  );
  assert.equal(trustedCatalogImageUrl("/assets/products/example.png", "javascript:alert(1)"), null);
  assert.equal(trustedCatalogImageUrl("https://evil.example.com/example.png", "https://wholesale.example.com"), null);
});
