import test from "node:test";
import assert from "node:assert/strict";

import { searchCatalogItems } from "../public/lib/catalog-search.js";

const items = [
  { id: "a", productTitle: "CUTS Thermogenic", flavor: "Blue Razz", item: "56232", upc: "858113007023", category: "Thermogenic Products", section: "thermogenics", sort: 1 },
  { id: "b", productTitle: "RULE Hyper Focus", flavor: "Watermelon Lemonade", item: "56278", upc: "810055900000", category: "High Stimulant & Focus Products", section: "focus", sort: 2 },
];

test("searches every supplied category and ranks exact SKU first", () => {
  assert.deepEqual(searchCatalogItems(items, "56278").map((item) => item.id), ["b"]);
  assert.deepEqual(searchCatalogItems(items, "thermogenic").map((item) => item.id), ["a"]);
});

test("matches flavor aliases and UPC", () => {
  assert.deepEqual(searchCatalogItems(items, "watlem").map((item) => item.id), ["b"]);
  assert.deepEqual(searchCatalogItems(items, "858113007023").map((item) => item.id), ["a"]);
});

test("empty search preserves original order", () => {
  assert.deepEqual(searchCatalogItems(items, "  ").map((item) => item.id), ["a", "b"]);
});
