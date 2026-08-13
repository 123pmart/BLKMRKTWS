import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { catalogItemMatchesSection, catalogItemSections } from "../public/lib/catalog-sections.js";

const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));

test("BULK PUMP appears in Strength and Pump without duplicating its catalog record", () => {
  const products = catalog.products.filter((product) => product.id === "bulk-pump-strength-liquid-glycerol");
  assert.equal(products.length, 1);
  assert.deepEqual(products[0].variants.map((variant) => variant.flavor), ["Rocket Pop", "Sour Gummy"]);

  const sections = catalogItemSections(products[0], "strength");
  const item = { section: "strength", sections };
  assert.equal(catalogItemMatchesSection(item, "strength"), true);
  assert.equal(catalogItemMatchesSection(item, "pump"), true);
  assert.equal(catalogItemMatchesSection(item, "thermogenics"), false);
});

test("each BULK PUMP flavor has its own complete three-image gallery", async () => {
  const product = catalog.products.find((entry) => entry.id === "bulk-pump-strength-liquid-glycerol");
  assert.ok(product);

  for (const variant of product.variants) {
    assert.equal(variant.galleryImages.length, 3);
    assert.equal(variant.galleryImages[0], variant.bottle);
    assert.equal(variant.galleryImages[2], variant.panel);
    assert.ok(variant.galleryImages.every((image) => image.includes(variant.flavor === "Rocket Pop" ? "rocket-pop" : "sour-gummy")));
    await Promise.all(variant.galleryImages.map((image) => stat(new URL(`../public${image}`, import.meta.url))));
  }
});

test("CUTS PUMP appears in Thermogenics and Pump", () => {
  const product = catalog.products.find((entry) => entry.id === "cuts-pump-thermogenic-liquid-glycerol");
  assert.ok(product);

  const sections = catalogItemSections(product, "thermogenics");
  const item = { section: "thermogenics", sections };
  assert.equal(catalogItemMatchesSection(item, "thermogenics"), true);
  assert.equal(catalogItemMatchesSection(item, "pump"), true);
  assert.equal(catalogItemMatchesSection(item, "strength"), false);
});
