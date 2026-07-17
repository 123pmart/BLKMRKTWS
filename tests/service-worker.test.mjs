import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/service-worker.js", import.meta.url), "utf8");

test("service worker exits before handling non-GET requests", () => {
  const methodGuard = source.indexOf('if (request.method !== "GET") return;');
  const firstRespondWith = source.indexOf("event.respondWith", methodGuard);
  assert.ok(methodGuard > -1);
  assert.ok(firstRespondWith > methodGuard);
});

test("service worker explicitly keeps private and mutable routes network-only", () => {
  for (const route of ["/api/", "/account", "/sign-in", "/admin", "upload", "auth", "order"]) {
    assert.ok(source.includes(route), `missing network-only exclusion for ${route}`);
  }
  assert.match(source, /request\.mode === "navigate"/);
});

test("cache writes are limited to successful same-origin basic responses and isolate failures", () => {
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /response\.status !== 200 \|\| response\.type !== "basic"/);
  assert.match(source, /const cacheCopy = response\.clone\(\)/);
  assert.match(source, /catch \(error\)/);
});
