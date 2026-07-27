import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/assistant/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/assistant/product-assistant.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/navigation/mobile-bottom-navigation.tsx", import.meta.url), "utf8");
const legacy = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const adminApi = await readFile(new URL("../app/api/admin/assistant-knowledge/route.ts", import.meta.url), "utf8");

test("assistant is a React-owned route that does not load the legacy application shell", () => {
  assert.match(page, /ProductAssistant/);
  assert.doesNotMatch(page, /legacy-response|public\/index\.html|app\.js/);
  assert.doesNotMatch(component, /public\/app\.js|legacy-response/);
});

test("BLACKMARKET AI uses the Spy Guy navigation icon without cluttering the chat", () => {
  assert.match(component, /BLACKMARKET AI/);
  assert.doesNotMatch(component, /spyguy-white\.png|Suggested product questions|STARTERS|assistant-product-grid|assistant-comparison/);
  assert.match(nav, /\/assistant/);
  assert.match(nav, /spyguy-white\.png/);
  assert.match(legacy, /data-portal-assistant/);
  assert.match(legacy, /Ask Spy Guy/);
});

test("assistant cart actions reuse the existing cart key and require confirmation", () => {
  assert.match(component, /blackmarket-wholesale-cart-v4/);
  assert.match(component, /Confirm/);
  assert.match(component, /blackmarket:cart-updated/);
  assert.doesNotMatch(component, /send-order/);
});

test("chat scrolling is isolated from the document viewport", () => {
  assert.match(component, /conversation\.scrollTop = conversation\.scrollHeight/);
  assert.doesNotMatch(component, /scrollIntoView/);
});

test("knowledge mutations require admin identity and same-origin protection", () => {
  assert.match(adminApi, /getAdminIdentity/);
  assert.match(adminApi, /sameOrigin\(request\)/);
  assert.match(adminApi, /Only Parker can mark Assistant Knowledge as verified/);
  assert.match(adminApi, /Cache-Control": "private, no-store/);
});
