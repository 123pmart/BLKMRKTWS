import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { catalogPresentation, catalogServingCount } from "../public/lib/catalog-presentation.js";

const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

test("every built-in variant has a concise product/flavor title and explicit serving count", () => {
  const before = JSON.stringify(catalog);
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      const view = catalogPresentation(product, variant);
      assert.ok(view.displayName);
      assert.equal(view.displayTitle, `${view.displayName} | ${variant.flavor}`);
      assert.match(view.servingsLabel, /^\d+(?:\/\d+)? Servings$/);
      assert.ok(!/thermogenic|pre-workout|high focus|hyper/i.test(view.displayName));
    }
  }
  assert.equal(JSON.stringify(catalog), before, "display cleanup must not change order data");
});

test("serving ranges remain accurate for liquids and two-scoop products", () => {
  for (const [id, label] of [
    ["cuts-pump-thermogenic-liquid-glycerol", "30/60 Servings"],
    ["bulk-pump-strength-liquid-glycerol", "30/60 Servings"],
    ["defy-hyper-stimulant", "20/40 Servings"],
    ["cuts-diamond-ultra-thermogenic", "25 Servings"],
    ["creatine-monohydrate-raw", "60 Servings"],
    ["bulk-pills-testosterone-capsules", "30 Servings"],
  ]) {
    const product = catalog.products.find((entry) => entry.id === id);
    assert.equal(catalogPresentation(product, product.variants[0]).servingsLabel, label);
  }
});

test("admin-added flavors inherit only an unambiguous parent serving count", () => {
  const rule = catalog.products.find((entry) => entry.id === "rule-hyper-focus");
  assert.deepEqual(catalogPresentation(rule, { flavor: "Dragon Punch", description: "RULE Dragon Punch" }), {
    displayName: "RULE", displayTitle: "RULE | Dragon Punch", servingsLabel: "20/40 Servings",
  });
  assert.equal(catalogPresentation({ title: "New Product", variants: [{ description: "20 Serv" }, { description: "30 Serv" }] }, {}).servingsLabel, "");
  assert.equal(catalogPresentation({ title: "New Product" }, { description: "300 mg caffeine" }).servingsLabel, "");
  assert.equal(catalogPresentation(rule, { flavor: "Small size", description: "10 servings" }).servingsLabel, "10 Servings");
});

test("serving count parsing ignores unrelated numbers and handles spacing", () => {
  assert.equal(catalogServingCount("Product 30 / 60 Serv"), "30/60");
  assert.equal(catalogServingCount("SKU 56330, 300mg caffeine"), "");
  assert.equal(catalogServingCount("20 g per serving"), "");
  assert.equal(catalogServingCount("1 Serving"), "1");
});

test("catalog and cart renderers use the concise title for every variant", () => {
  const escaping = source.slice(source.indexOf("function escapeHtml("), source.indexOf("function showToast("));
  const cardRenderer = source.slice(source.indexOf("function renderSkuCard("), source.indexOf("function preloadProductMedia("));
  const cartRenderer = source.slice(source.indexOf("function renderCartLine("), source.indexOf("function updateOrderState("));
  const context = vm.createContext({ isOrderable: () => true, renderMiniQty: () => "", money: () => "$24.00" });
  vm.runInContext(`${escaping}\n${cardRenderer}\n${cartRenderer}`, context);
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      context.item = { ...variant, fullTitle: `${product.title} ${variant.flavor}`, ...catalogPresentation(product, variant) };
      const card = vm.runInContext("renderSkuCard(item)", context);
      const cart = vm.runInContext("renderCartLine({ item, qty: 2, lineWholesale: 48 })", context);
      const title = vm.runInContext("escapeHtml(item.displayTitle)", context);
      assert.ok(card.includes(`<h4>${title}</h4>`), variant.id);
      assert.ok(cart.includes(`<h3>${title}</h3>`), variant.id);
      const badge = card.match(/<span class="sku-flavor-chip[^\"]*">([^<]+)<\/span>/);
      assert.equal(badge?.[1] || "", variant.limitedEdition ? "Limited" : "", "the badge is status-only, not a duplicate flavor");
    }
  }
});
