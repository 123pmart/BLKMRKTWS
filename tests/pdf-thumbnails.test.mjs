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

test("PDF SKU fallbacks use current unique item numbers, not stale ID suffixes", () => {
  const variants = catalog.products.flatMap((product) => product.variants || []);
  for (const variant of variants) {
    const matches = variants.filter((entry) => entry.item === variant.item);
    assert.equal(thumbnails.items[variant.item], matches.length === 1 ? variant.id : undefined);
  }
  assert.equal(thumbnails.items["56182"], undefined);
  assert.equal(thumbnails.items["56339"], undefined);
  assert.equal(thumbnails.items["56340"], undefined);
});

test("DEFY and RULE retain their distinct images and stable IDs after item corrections", () => {
  for (const suffix of ["peach-rings-56277", "watermelon-lemonade-56278", "razz-mango-sherbert-56182"]) {
    const defy = thumbnails.images[`defy-hyper-stimulant-${suffix}`];
    const rule = thumbnails.images[`rule-hyper-focus-${suffix}`];
    assert.ok(defy && rule);
    assert.notEqual(defy, rule);
  }
});
