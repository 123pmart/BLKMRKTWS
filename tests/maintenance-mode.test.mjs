import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeContentPayload, publicContent } from "../app/api/content/store.js";

const portalHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const portalScript = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const portalStyles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");
const orderRoute = await readFile(new URL("../app/api/send-order/route.js", import.meta.url), "utf8");
const loginRoute = await readFile(new URL("../app/api/account/login/route.ts", import.meta.url), "utf8");
const registrationRoute = await readFile(new URL("../app/api/account/register/route.ts", import.meta.url), "utf8");
const signInPage = await readFile(new URL("../app/sign-in/page.tsx", import.meta.url), "utf8");
const reactNavigation = await readFile(new URL("../app/components/navigation/mobile-bottom-navigation.tsx", import.meta.url), "utf8");

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
  assert.doesNotMatch(portalHtml, />Contact Us<\/a>/);
  assert.match(portalHtml, /data-view="news"/);
  assert.match(portalHtml, /data-view="catalog"/);
  assert.match(portalHtml, /id="maintenanceNoticeDismiss"/);
  assert.match(portalHtml, /aria-label="Dismiss maintenance message"/);
  assert.match(portalScript, /if \(isPortalMaintenanceMode\(\)\) return "";/);
  assert.match(portalScript, /sessionStorage\.setItem\(MAINTENANCE_NOTICE_DISMISSED_KEY, "true"\)/);
  assert.match(portalStyles, /maintenance-catalog-mode[^}]+\.sku-card\s*\{\s*grid-template-rows: auto 168px 1fr auto;/);
  assert.match(portalScript, /if \(isPortalMaintenanceMode\(\)\) \{\s+showToast\("Online ordering is paused/);
  assert.doesNotMatch(portalScript, /if \(isPortalMaintenanceMode\(\) && view !== "admin"\) view = "products"/);
});

test("maintenance mode hides account and cart entry points and rejects new customer authentication", () => {
  assert.match(portalStyles, /maintenance-catalog-mode[^}]+\.desktop-account-link/);
  assert.match(portalStyles, /maintenance-catalog-mode[^}]+\.portal-bottom-nav \[data-account-route\]/);
  assert.match(portalStyles, /maintenance-catalog-mode[^}]+\.portal-bottom-nav \[data-portal-cart\]/);
  assert.equal(reactNavigation.match(/!maintenanceMode \? \(/g)?.length, 2);
  assert.match(portalScript, /function openCartDrawer[\s\S]+if \(isPortalMaintenanceMode\(\)\)/);
  assert.match(portalScript, /window\.history\.replaceState\(window\.history\.state, "", "\/products"\)/);
  assert.match(signInPage, /if \(await isPortalMaintenanceMode\(\)\) redirect\("\/products"\)/);
  assert.match(loginRoute, /if \(await isPortalMaintenanceMode\(\)\)/);
  assert.match(registrationRoute, /if \(await isPortalMaintenanceMode\(\)\)/);
  assert.match(loginRoute, /status: 503/);
  assert.match(registrationRoute, /status: 503/);
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
