import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

test("quantity buttons prevent double-tap zoom without disabling page pinch zoom", () => {
  assert.match(
    styles,
    /\.qty-mini button,\s*\.qty-control button\s*\{[^}]*touch-action:\s*manipulation;/s,
  );
  assert.match(html, /name="viewport"\s+content="width=device-width,\s*initial-scale=1"/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
});
