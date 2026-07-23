import assert from "node:assert/strict";
import test from "node:test";

import { decodeEmbeddedCatalogImage } from "../app/lib/catalog/embedded-image.ts";

const tinyWebp = Buffer.from("UklGRgwAAABXRUJQVlA4IAAAAAA=", "base64");

test("PDF thumbnails accept a valid embedded WebP catalog image", () => {
  const decoded = decodeEmbeddedCatalogImage(`data:image/webp;base64,${tinyWebp.toString("base64")}`);
  assert.deepEqual(decoded, tinyWebp);
});

test("PDF thumbnails reject mismatched and malformed embedded images", () => {
  assert.equal(decodeEmbeddedCatalogImage(`data:image/png;base64,${tinyWebp.toString("base64")}`), null);
  assert.equal(decodeEmbeddedCatalogImage("data:text/html;base64,PGgxPm5vPC9oMT4="), null);
  assert.equal(decodeEmbeddedCatalogImage("data:image/webp;base64,not-valid-%%%"), null);
});
