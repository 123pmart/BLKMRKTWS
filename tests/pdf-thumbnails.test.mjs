import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const thumbnails = JSON.parse(await readFile(new URL("../app/lib/orders/pdf-product-thumbnails.json", import.meta.url), "utf8"));

test("every built-in catalog variant has a bundled PDF thumbnail", () => {
  const variants = catalog.products.flatMap((product) => product.variants || []);
  assert.ok(variants.length > 0);
  for (const variant of variants) {
    const item = String(variant.item || "");
    const bytes = Buffer.from(thumbnails.items[item] || "", "base64");
    assert.equal(thumbnails.variants[String(variant.id || "")], item);
    assert.ok(bytes.byteLength > 1_000, `missing thumbnail for item ${item}`);
    assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `item ${item} is not a JPEG`);
  }
});
