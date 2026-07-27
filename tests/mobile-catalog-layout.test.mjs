import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const portalScript = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const portalStyles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");

test("legacy mobile Cart opens the existing drawer without reloading the portal", () => {
  assert.match(
    portalScript,
    /querySelector\("\[data-portal-cart\]"\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?openCartDrawer\(event\.currentTarget\);/,
  );
});

test("account pricing hydration is not blocked by content hydration", () => {
  assert.match(
    portalScript,
    /Promise\.all\(\[\s*hydrateAccountPricing\(pricingRequest\),\s*hydratePortalContent\(contentRequest\),\s*\]\)/,
  );
});

test("mobile categories retain a partial next-card scroll cue while products preserve a right gutter", () => {
  assert.match(portalStyles, /\.category-tile\s*\{\s*flex:\s*0 0 132px;/);
  assert.match(
    portalStyles,
    /@media \(max-width: 520px\)[\s\S]*?\.sku-row\.unified-grid\s*\{[^}]*width:\s*calc\(100% - 2px\);[^}]*margin-inline:\s*1px;/,
  );
});
