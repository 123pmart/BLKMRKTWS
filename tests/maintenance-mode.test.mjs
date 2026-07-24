import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeContentPayload, publicContent } from "../app/api/content/store.js";

const portalHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const portalScript = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const portalStyles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");
const orderRoute = await readFile(new URL("../app/api/send-order/route.js", import.meta.url), "utf8");

test("maintenance mode defaults on for this deployment and persists explicit admin changes", () => {
  assert.equal(normalizeContentPayload({}).maintenanceMode, true);
  assert.equal(normalizeContentPayload({ maintenanceMode: false }).maintenanceMode, false);
  assert.equal(publicContent(normalizeContentPayload({ maintenanceMode: true })).maintenanceMode, true);
});

test("admin includes a persisted maintenance switch", () => {
  assert.match(portalHtml, /id="adminMaintenanceToggle"/);
  assert.match(portalHtml, /role="switch"/);
  assert.match(portalScript, /maintenanceMode: isPortalMaintenanceMode\(\)/);
  assert.match(portalScript, /updatePortalMaintenanceMode/);
  assert.match(portalScript, /Portal status was not changed because cloud save failed/);
  assert.match(portalStyles, /body\[data-view="admin"\] \.maintenance-catalog-hero\s*\{\s*display: none !important;/);
});

test("maintenance customers retain catalog access without ordering controls", () => {
  assert.match(portalHtml, /id="maintenanceCatalogHero"/);
  assert.match(portalHtml, /id="productsView"/);
  assert.match(portalHtml, /mailto:pmart@blackmarketlabs\.com/);
  assert.match(portalScript, /Ordering paused/);
  assert.match(portalScript, /if \(isPortalMaintenanceMode\(\)\) \{\s+showToast\("Online ordering is paused/);
  assert.match(portalScript, /if \(isPortalMaintenanceMode\(\) && view !== "admin"\) view = "products"/);
});

test("the server rejects submissions whenever persisted maintenance mode is active", () => {
  const maintenanceCheck = orderRoute.indexOf("portalContent?.maintenanceMode !== false");
  const pricingCheck = orderRoute.indexOf("verifiedPayload = await repriceOrderPayload");
  const orderWrite = orderRoute.indexOf("await upsertOrder(order);");
  assert.ok(maintenanceCheck > -1);
  assert.ok(pricingCheck > maintenanceCheck);
  assert.ok(orderWrite > maintenanceCheck);
  assert.match(orderRoute, /Your cart has not been cleared/);
  assert.match(orderRoute, /status: 503/);
});
