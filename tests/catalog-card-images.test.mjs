import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import sharp from "sharp";

test("catalog variants have compact WebP card images while retaining original media", async () => {
  const publicRoot = new URL("../public/", import.meta.url);
  const catalog = JSON.parse(await readFile(new URL("catalog-data.json", publicRoot), "utf8"));
  let originalBytes = 0;
  let cardBytes = 0;
  let variants = 0;

  for (const product of catalog.products) {
    for (const variant of product.variants) {
      assert.match(variant.cardImage, /^\/assets\/catalog-cards\/[a-z0-9-]+\.webp$/);
      assert.notEqual(variant.cardImage, variant.bottle);
      const original = new URL(variant.bottle.replace(/^\//, ""), publicRoot);
      const card = new URL(variant.cardImage.replace(/^\//, ""), publicRoot);
      const [originalStats, cardStats, metadata] = await Promise.all([stat(original), stat(card), sharp(fileURLToPath(card)).metadata()]);
      assert.equal(metadata.format, "webp");
      assert.ok((metadata.width || 0) <= 640);
      assert.ok((metadata.height || 0) <= 640);
      originalBytes += originalStats.size;
      cardBytes += cardStats.size;
      variants += 1;
    }
  }

  assert.equal(variants, 58);
  assert.ok(cardBytes < originalBytes * 0.4, `Expected optimized cards to be below 40% of originals; got ${(cardBytes / originalBytes * 100).toFixed(1)}%`);
});
