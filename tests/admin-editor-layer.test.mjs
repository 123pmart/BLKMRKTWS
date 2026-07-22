import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");

test("admin editors escape the active-view stacking context", () => {
  assert.match(
    styles,
    /body\.admin-news-editing #adminView,\s*body\.admin-product-editing #adminView\s*{[^}]*animation:\s*none;[^}]*transform:\s*none;/s,
  );
});
