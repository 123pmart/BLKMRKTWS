import assert from "node:assert/strict";
import { stat, readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../public/", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("catalog-data.json", publicRoot), "utf8"));
const factsImage = "/assets/products/bulk-testosterone-pre-workout-supplement-facts.jpg";

test("all three BULK Original variants use the readable Supplement Facts label", async () => {
  const product = catalog.products.find((entry) => entry.id === "bulk-testosterone-pre-workout");

  assert.ok(product, "BULK Original product is missing");
  assert.equal(product.panel, factsImage);
  assert.deepEqual(
    product.variants.map((variant) => variant.id),
    [
      "bulk-testosterone-pre-workout-fruit-punch-51114",
      "bulk-testosterone-pre-workout-watermelon-51115",
      "bulk-testosterone-pre-workout-blue-razz-51116",
    ],
  );
  assert.ok(product.variants.every((variant) => variant.panel === factsImage));
  assert.ok(product.siteImages.includes(factsImage));

  const image = new URL(factsImage.replace(/^\//, ""), publicRoot);
  const imageStats = await stat(image);
  assert.ok(imageStats.size > 100_000, "BULK Supplement Facts image is unexpectedly small");
});
