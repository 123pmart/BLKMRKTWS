import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { catalogPresentation } from "../public/lib/catalog-presentation.js";

const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

const products = new Map(catalog.products.map((product) => [product.id, product]));

async function assertAsset(url) {
  assert.match(url, /^\/assets\//);
  await access(new URL(`../public${url}`, import.meta.url));
}

test("FUEL has both launch flavors and belongs to Strength & Endurance", async () => {
  const product = products.get("fuel-performance-pre-workout");
  assert.ok(product);
  assert.equal(product.categorySlug, "strength");
  assert.deepEqual(product.variants.map((variant) => variant.flavor), ["Sour Green Apple", "Streetarts"]);
  assert.deepEqual(product.variants.map((variant) => catalogPresentation(product, variant).displayTitle), [
    "FUEL - Sour Green Apple",
    "FUEL - Streetarts",
  ]);
  for (const variant of product.variants) {
    assert.equal(catalogPresentation(product, variant).servingsLabel, "20 Servings");
    assert.equal(variant.galleryImages.length, 4);
    await Promise.all(variant.galleryImages.map(assertAsset));
  }
});

test("TEN has both launch flavors and belongs to RAWS", async () => {
  const product = products.get("ten-hyper-creatine");
  assert.ok(product);
  assert.equal(product.categorySlug, "raws");
  assert.deepEqual(product.variants.map((variant) => variant.flavor), ["Loaded Lemonade", "Sour Watermelon"]);
  assert.deepEqual(product.variants.map((variant) => catalogPresentation(product, variant).displayTitle), [
    "TEN - Loaded Lemonade",
    "TEN - Sour Watermelon",
  ]);
  for (const variant of product.variants) {
    assert.equal(catalogPresentation(product, variant).servingsLabel, "30 Servings");
    assert.equal(variant.wholesaleValue, 25);
    assert.equal(variant.mapValue, 49.99);
    assert.equal(variant.galleryImages.length, 4);
    await Promise.all(variant.galleryImages.map(assertAsset));
  }
});

test("new listings have unique valid identifiers and the updated section label", () => {
  const variants = catalog.products.flatMap((product) => product.variants);
  assert.equal(new Set(variants.map((variant) => variant.item)).size, variants.length);
  assert.equal(new Set(variants.map((variant) => variant.upc)).size, variants.length);
  for (const productId of ["fuel-performance-pre-workout", "ten-hyper-creatine"]) {
    for (const variant of products.get(productId).variants) {
      assert.match(variant.item, /^\d{5}$/);
      assert.match(variant.upc, /^\d{12}$/);
      const checksum = [...variant.upc].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 1 : 3), 0);
      assert.equal(checksum % 10, 0);
    }
  }
  assert.equal(catalog.categories.find((category) => category.slug === "strength").short, "Strength & Endurance");
  assert.match(appSource, /label: "STRENGTH & ENDURANCE"/);
});
