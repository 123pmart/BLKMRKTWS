import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { catalogIdentifiers } from "../public/lib/catalog-identifiers.js";

const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const catalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const master = JSON.parse(await readFile(new URL("./fixtures/master-identifiers-2026-09-02.json", import.meta.url), "utf8"));
// Execute the real legacy modal renderer, not a separate test-only template.
const renderer = source.slice(source.indexOf("function openProductModal("), source.indexOf("function showDialog("));
const escaping = source.slice(source.indexOf("function escapeHtml("), source.indexOf("function showToast("));

function renderDetail(variant) {
  const item = { ...variant, fullTitle: "Test Product", productId: "product", description: "Product description" };
  const context = vm.createContext({
    state: { items: [item], products: [{ id: "product" }] },
    dom: { modalContent: { innerHTML: "" }, productModal: {} },
    document: { activeElement: null, querySelector: () => null },
    HTMLElement: class {}, lastProductTrigger: null,
    imageGalleryForItem: () => [], enqueueMediaPreloads: () => {},
    isOrderable: () => true, renderMiniQty: () => "", showDialog: () => {},
  });
  vm.runInContext(`${escaping}\n${renderer}\nopenProductModal(${JSON.stringify(item.id)}, null, { history: false });`, context);
  return context.dom.modalContent.innerHTML;
}

test("every built-in product detail displays its variant UPC below the title", () => {
  for (const variant of catalog.products.flatMap((product) => product.variants)) {
    const item = { ...variant, ...catalogIdentifiers(variant) };
    const html = renderDetail(item);
    assert.ok(item.upc);
    assert.ok(html.includes(`<dd>${item.upc}</dd>`), item.id);
    assert.match(html, /<h2>Test Product<\/h2>\s*<dl class="detail-upc">\s*<dt>UPC<\/dt>/);
  }
});

test("admin-managed Dragon Punch uses the corrected UPC in product details", () => {
  const row = master.entries.find((entry) => entry.item === "56330");
  const variant = { id: row.variantId, item: "56330", upc: "" };
  const html = renderDetail({ ...variant, ...catalogIdentifiers(variant) });
  assert.ok(html.includes(`<dd>${row.upc}</dd>`));
});

test("missing or unsafe admin UPC values cannot create blank or injected markup", () => {
  assert.ok(renderDetail({ id: "future", upc: " " }).includes("<dd>Not provided</dd>"));
  const html = renderDetail({ id: "unsafe", upc: '<img src=x onerror="alert(1)">' });
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.ok(!html.includes('<img src=x onerror="alert(1)">'));
});
