import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { normalizeContentPayload, publicContent } from "../app/api/content/store.js";

const page = await readFile(new URL("../app/assistant/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/assistant/product-assistant.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/navigation/mobile-bottom-navigation.tsx", import.meta.url), "utf8");
const legacy = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const legacyScript = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const adminApi = await readFile(new URL("../app/api/admin/assistant-knowledge/route.ts", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../app/admin/assistant/page.tsx", import.meta.url), "utf8");
const adminEditor = await readFile(new URL("../app/components/assistant/assistant-knowledge-editor.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("assistant is a React-owned route that does not load the legacy application shell", () => {
  assert.match(page, /ProductAssistant/);
  assert.doesNotMatch(page, /legacy-response|public\/index\.html|app\.js/);
  assert.doesNotMatch(component, /public\/app\.js|legacy-response/);
});

test("BLACKMARKET AI stays hidden from customers until the persisted release switch is enabled", () => {
  assert.equal(normalizeContentPayload({}).assistantEnabled, false);
  assert.equal(normalizeContentPayload({ assistantEnabled: true }).assistantEnabled, true);
  assert.equal(publicContent(normalizeContentPayload({ assistantEnabled: false })).assistantEnabled, false);
  assert.match(component, /BLACKMARKET AI/);
  assert.doesNotMatch(component, /spyguy-white\.png|Suggested product questions|STARTERS|assistant-product-grid|assistant-comparison/);
  assert.match(nav, /assistantEnabled \? \(/);
  assert.match(nav, /spyguy-white\.png/);
  assert.match(layout, /assistantEnabled=\{availability\.enabled\}/);
  assert.match(legacy, /data-portal-assistant[^>]+hidden/);
  assert.match(legacyScript, /assistantEnabled: isCustomerAssistantEnabled\(\)/);
  assert.match(legacyScript, /entry\.hidden = !enabled/);
  assert.match(page, /if \(!availability\.enabled && !adminIdentity\) redirect\("\/"\)/);
  assert.match(page, /adminPreview=\{!availability\.enabled && Boolean\(adminIdentity\)\}/);
});

test("admin can configure, privately test, and release BLACKMARKET AI", () => {
  assert.match(adminPage, /assistantEnabled=\{content\?\.assistantEnabled === true\}/);
  assert.match(adminEditor, /Open Test Console/);
  assert.match(adminEditor, /Activate for Customers/);
  assert.match(adminEditor, /Disable Customer Access/);
  assert.match(adminApi, /export async function PATCH/);
  assert.match(adminApi, /Only Parker can change customer access/);
  assert.match(adminApi, /assistantEnabled: payload\.enabled/);
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

test("assistant composer avoids iOS focus zoom and answers stream progressively", () => {
  assert.match(globalStyles, /\.assistant-composer input[\s\S]*font-size:\s*16px/);
  assert.match(component, /function StreamingText/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /assistant-stream-cursor/);
});

test("knowledge mutations require admin identity and same-origin protection", () => {
  assert.match(adminApi, /getAdminIdentity/);
  assert.match(adminApi, /sameOrigin\(request\)/);
  assert.match(adminApi, /Only Parker can mark Assistant Knowledge as verified/);
  assert.match(adminApi, /Cache-Control": "private, no-store/);
});
