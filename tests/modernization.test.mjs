import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { cartReducer, emptyCartState, migrateStoredCart } from "../app/lib/cart/reducer.ts";
import { validateStoreProfile } from "../app/lib/account/profile.ts";
import { buildReorderReview, reorderQuantities } from "../app/lib/orders/reorder.ts";
import { searchCatalogItems } from "../app/lib/catalog/search.ts";
import { isSameOriginRequest } from "../app/lib/http/same-origin.ts";

const item = { id: "variant-a", variantId: "variant-a", productId: "product-a", productTitle: "CUTS", category: "Thermogenic", categorySlug: "thermogenic", section: "thermogenics", fullTitle: "CUTS Blue Razz", productDescription: "", sort: 0, aliases: ["bluerazz"], gallery: [], orderable: true, item: "56232", upc: "858113007023", flavor: "Blue Razz", wholesale: "$24.00", wholesaleValue: 24, map: "$49.99", mapValue: 49.99, status: "available" };

test("cart reducer supports set, increment, decrement, merge, replace, prune, and v4 migration", () => {
  let state = emptyCartState();
  state = cartReducer(state, { type: "set", variantId: "a", quantity: 2 });
  state = cartReducer(state, { type: "increment", variantId: "a" });
  state = cartReducer(state, { type: "decrement", variantId: "a" });
  assert.equal(state.quantities.a, 2);
  state = cartReducer(state, { type: "merge", quantities: { a: 2, b: 1 } });
  assert.deepEqual(state.quantities, { a: 4, b: 1 });
  state = cartReducer(state, { type: "replace", quantities: { c: 5 } });
  assert.deepEqual(state.quantities, { c: 5 });
  state = cartReducer(state, { type: "prune", availableVariantIds: [] });
  assert.deepEqual(state.quantities, {});
  assert.deepEqual(migrateStoredCart({ a: 3 }).quantities, { a: 3 });
});

test("profile validation normalizes fields without accepting ownership or salesperson input", () => {
  const result = validateStoreProfile({ storeName: " Test Store ", contactName: " Buyer ", email: "BUYER@EXAMPLE.COM", phone: "5551234567", street: "1 Main St", city: "Denver", state: "co", zip: "80202" });
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "buyer@example.com");
  assert.equal(result.value.state, "CO");
  assert.equal("salesperson" in result.value, false);
  assert.equal(validateStoreProfile({}).ok, false);
});

test("profile mutations accept real same-origin browser signals and reject cross-site requests", () => {
  assert.equal(isSameOriginRequest(new Request("https://portal.example/api/account/profile", {
    method: "PATCH", headers: { Origin: "https://portal.example" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("http://0.0.0.0:4173/api/account/profile", {
    method: "PATCH", headers: { Origin: "http://localhost:4173", Host: "localhost:4173" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("http://0.0.0.0:4173/api/account/profile", {
    method: "PATCH", headers: { Origin: "https://portal.example", Host: "internal", "X-Forwarded-Host": "portal.example", "X-Forwarded-Proto": "https" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://portal.example/api/account/profile", {
    method: "PATCH", headers: { "Sec-Fetch-Site": "same-origin" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://portal.example/api/account/profile", {
    method: "PATCH", headers: { "Content-Type": "application/json", "X-Blackmarket-Request": "portal" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://portal.example/api/account/profile", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
  })), true);
  assert.equal(isSameOriginRequest(new Request("https://portal.example/api/account/profile", {
    method: "PATCH", headers: { Origin: "https://attacker.example", "Content-Type": "application/json", "X-Blackmarket-Request": "portal" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://portal.example/api/account/profile", { method: "PATCH" })), false);
});

test("reorder validates stable identifiers, excludes unavailable lines, and uses current catalog prices", () => {
  const review = buildReorderReview([
    { variantId: "variant-a", product: "CUTS", flavor: "Blue Razz", item: "56232", wholesale: "$18.00", map: "$49.99", qty: 3, lineWholesale: 54, lineMap: 149.97 },
    { variantId: "gone", product: "Old", flavor: "Flavor", item: "000", wholesale: "$1.00", map: "$2.00", qty: 2, lineWholesale: 2, lineMap: 4 },
  ], [item]);
  assert.equal(review.available[0].item.wholesale, "$24.00");
  assert.equal(review.unavailable.length, 1);
  assert.deepEqual(reorderQuantities(review), { "variant-a": 3 });
});

test("quick-order search ranks exact SKU and aliases", () => {
  assert.equal(searchCatalogItems([item], "56232")[0].variantId, "variant-a");
  assert.equal(searchCatalogItems([item], "bluerazz")[0].variantId, "variant-a");
});

test("registration, login, and admin approval implement a pending workflow", async () => {
  const [registration, login, admin] = await Promise.all([
    readFile(new URL("../app/api/account/register/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/accounts/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(registration, /status: "pending"/);
  assert.doesNotMatch(registration, /createAccountSession/);
  assert.match(login, /APPROVAL_PENDING/);
  assert.doesNotMatch(login, /record\.status === "pending" \? "active"/);
  assert.match(admin, /"pending", "active", "disabled"/);
});

test("customer routes are React pages and do not load the legacy shell", async () => {
  const paths = ["app/page.tsx", "app/products/page.tsx", "app/products/[slug]/page.tsx", "app/cart/page.tsx", "app/news/page.tsx", "app/catalog/page.tsx"];
  for (const path of paths) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /legacyPortalResponse|public\/app\.js|index\.html/);
  }
  const admin = await readFile(new URL("../app/admin/route.ts", import.meta.url), "utf8");
  assert.match(admin, /legacyPortalResponse/);
});

test("product cards use separate link and quantity controls without an interactive wrapper", async () => {
  const source = await readFile(new URL("../app/components/catalog/product-card.tsx", import.meta.url), "utf8");
  assert.match(source, /<article/);
  assert.match(source, /<Link/);
  assert.match(source, /<QuantityControl/);
  assert.doesNotMatch(source, /role=["']button/);
});

test("mobile navigation is viewport-fixed and includes cart", async () => {
  const [css, nav] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/navigation/mobile-bottom-navigation.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(css, /\.liquid-mobile-nav\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(nav, /name="cart"/);
});
