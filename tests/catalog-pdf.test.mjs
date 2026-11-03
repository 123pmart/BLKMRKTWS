import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const catalogPages = JSON.parse(await readFile(new URL("../public/catalog-pages.json", import.meta.url), "utf8"));
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const catalogView = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

test("updated 2026 catalog includes every rendered page and a cache-busted download", async () => {
  assert.equal(catalogPages.pages.length, 12);
  assert.deepEqual(catalogPages.pages.map((page) => page.page), Array.from({ length: 12 }, (_, index) => index + 1));
  for (const page of catalogPages.pages) {
    assert.equal(page.width, 900);
    assert.equal(page.height, 1165);
    assert.match(page.src, /\?v=20261029$/);
    await access(new URL(`../public${page.src.replace(/\?.*$/, "")}`, import.meta.url));
  }
  await access(new URL("../public/assets/BlackMarketLabs_Product_Catalog.pdf", import.meta.url));
  assert.match(appSource, /catalog-pages\.json\?v=20261029-updated-catalog/);
  assert.match(catalogView, /BlackMarketLabs_Product_Catalog\.pdf\?v=20261029/);
});
