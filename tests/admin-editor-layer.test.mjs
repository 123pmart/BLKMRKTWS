import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");

test("admin editors escape the active-view stacking context", () => {
  assert.match(
    styles,
    /body\.admin-news-editing #adminView,\s*body\.admin-product-editing #adminView,\s*body\.admin-pricing-editing #adminView\s*{[^}]*animation:\s*none;[^}]*transform:\s*none;/s,
  );
});

test("store pricing editor is a viewport-level overlay with a scrollable product grid", () => {
  assert.match(styles, /\.admin-pricing-editor\s*{[^}]*position:\s*fixed;[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\) auto;/s);
  assert.match(styles, /\.admin-pricing-grid\s*{[^}]*overflow:\s*auto;/s);
});
