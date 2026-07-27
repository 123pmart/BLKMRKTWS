import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const thumbnails = JSON.parse(await readFile(new URL("../app/lib/orders/pdf-product-thumbnails.json", import.meta.url), "utf8"));

test("every built-in catalog variant has a bundled PDF thumbnail", () => {
  const variants = catalog.products.flatMap((product) => product.variants || []);
  assert.ok(variants.length > 0);
  for (const variant of variants) {
    const variantId = String(variant.id || "");
    const bytes = Buffer.from(thumbnails.images[variantId] || "", "base64");
    assert.ok(bytes.byteLength > 1_000, `missing thumbnail for variant ${variantId}`);
    assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `variant ${variantId} is not a JPEG`);
  }
});

test("shared DEFY and RULE item numbers retain distinct variant thumbnails", () => {
  for (const item of ["56277", "56278", "56182"]) {
    const variants = catalog.products
      .flatMap((product) => product.variants || [])
      .filter((variant) => String(variant.item || "") === item);
    assert.equal(variants.length, 2);
    assert.equal(thumbnails.items[item], undefined, `ambiguous item ${item} must not have a SKU-only fallback`);
    const encoded = variants.map((variant) => thumbnails.images[String(variant.id || "")]);
    assert.ok(encoded.every(Boolean));
    assert.notEqual(encoded[0], encoded[1], `item ${item} variants must not share an image`);
  }
});
