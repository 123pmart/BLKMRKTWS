import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the PDF bundles the exact supplied order logo", async () => {
  const source = await readFile(new URL("../public/assets/brand/blackmarket-wholesale-order-logo.jpg", import.meta.url));
  const data = JSON.parse(await readFile(new URL("../app/lib/orders/pdf-brand-logo.json", import.meta.url), "utf8"));
  const bundled = Buffer.from(data.data, "base64");

  assert.equal(data.mimeType, "image/jpeg");
  assert.equal(data.width, 1280);
  assert.equal(data.height, 266);
  assert.deepEqual(bundled, source);
});
