import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalogIdentifiers } from "../public/lib/catalog-identifiers.js";
import { normalizeContentPayload } from "../app/api/content/store.js";
import { searchCatalogItems } from "../public/lib/catalog-search.js";

const master = JSON.parse(await readFile(new URL("./fixtures/master-identifiers-2026-09-02.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const variants = catalog.products.flatMap((product) => product.variants);
const dragon = {
  id: "extension-rule-hyper-focus-dragon-punch-1783533527232-dragon-punch",
  item: "56330", upc: "", flavor: "Dragon Punch", wholesaleValue: 28,
};

test("all 56 master rows match built-in or admin-managed catalog identifiers", () => {
  assert.equal(master.entries.length, 56);
  for (const row of master.entries) {
    const variant = [...variants, dragon].find((entry) => entry.id === row.variantId);
    assert.ok(variant, `Missing product at master row ${row.row}: ${row.description}`);
    const expected = { item: row.item, upc: row.upc };
    assert.deepEqual(catalogIdentifiers(variant), expected, `Master row ${row.row}`);
    if (variant !== dragon) {
      assert.deepEqual({ item: variant.item, upc: variant.upc }, expected, `Static data row ${row.row}`);
    }
    assert.match(row.item, /^\d{5}$/);
    assert.match(row.upc, /^\d{12}$/);
    const check = [...row.upc].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 1 : 3), 0);
    assert.equal(check % 10, 0, `UPC-A check digit at master row ${row.row}`);
  }
});

test("corrected catalog has no duplicate item numbers or UPCs", () => {
  const corrected = [...variants, dragon].map(catalogIdentifiers);
  for (const field of ["item", "upc"]) {
    assert.equal(new Set(corrected.map((entry) => entry[field])).size, corrected.length, field);
  }
});

test("live Dragon Punch correction preserves custom data without changing its stable ID", () => {
  const input = { customProducts: [{ id: "extension-rule", title: "RULE", variants: [dragon] }] };
  const content = normalizeContentPayload(input);
  assert.deepEqual(content.customProducts[0].variants[0], { ...dragon, upc: "810055901609" });
  assert.equal(dragon.upc, "", "normalization must not mutate its source");
});

test("stale cached identifiers resolve by stable variant, not an ambiguous old SKU", () => {
  assert.deepEqual(catalogIdentifiers({ id: "rule-hyper-focus-peach-rings-56277", item: "56277" }), {
    item: "56284", upc: "810055901210",
  });
  assert.deepEqual(catalogIdentifiers({ id: "defy-hyper-stimulant-peach-rings-56277", item: "56277", upc: "810055901128" }), {
    item: "56277", upc: "810055901128",
  });
  const custom = { id: "unrelated-new-variant", item: "56340", upc: "000000000123" };
  assert.deepEqual(catalogIdentifiers(custom), { item: custom.item, upc: custom.upc });
});

test("flavors absent from the master retain their existing identifiers", () => {
  assert.equal(master.notListed.length, 3);
  for (const prior of master.notListed) {
    const variant = variants.find((entry) => entry.id === prior.id);
    assert.ok(variant);
    assert.deepEqual(catalogIdentifiers(variant), { item: prior.item, upc: prior.upc });
  }
});

test("corrected item and UPC searches find every master product", () => {
  const items = [...variants, dragon].map((variant) => ({ ...variant, ...catalogIdentifiers(variant) }));
  for (const row of master.entries) {
    for (const query of [row.item, row.upc]) {
      assert.equal(searchCatalogItems(items, query)[0]?.id, row.variantId, query);
    }
  }
});

test("browser, content persistence, and server order catalog share identifier reconciliation", async () => {
  for (const file of ["../public/app.js", "../app/api/content/store.js", "../app/lib/catalog/server-catalog.ts"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /catalogIdentifiers\(variant\)/, file);
  }
  const pricing = await readFile(new URL("../app/lib/catalog/pricing.ts", import.meta.url), "utf8");
  assert.match(pricing, /item: item\.item/);
  assert.match(pricing, /upc: item\.upc/);
});
