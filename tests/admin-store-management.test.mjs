import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const api = await readFile(new URL("../app/api/admin/accounts/route.ts", import.meta.url), "utf8");
const store = await readFile(new URL("../app/lib/account/account-store.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

test("admin store deletion is scoped, invalidates sessions, and preserves historical orders", () => {
  assert.match(api, /export async function DELETE\(request: Request\)/);
  assert.match(api, /adminCanAccessSalesperson\(identity,\s*accountSalesperson\(account\)\)/);
  assert.match(api, /await deleteAccount\(account\.username,\s*account\.id\)/);
  assert.match(api, /Historical orders were preserved/);
  assert.match(store, /deleteSessionsForAccount\(accountId\)/);
  assert.match(app, /method:\s*"DELETE"/);
  assert.match(app, /Historical orders will remain in the admin inbox/);
});

test("dedicated pricing editor supports validated bulk variant changes", () => {
  assert.match(api, /action === "set-prices"/);
  assert.match(api, /catalog\.find\(\(item\) => item\.variantId === variantId\)/);
  assert.match(api, /touched\.has\(entry\.variantId\)/);
  assert.match(html, /id="adminPricingEditor"/);
  assert.match(html, /id="adminPricingGrid"/);
  assert.match(app, /data-store-action="pricing"/);
  assert.match(app, /data-price-adjust="-1"/);
  assert.match(app, /data-price-adjust="1"/);
  assert.match(app, /action:\s*"set-prices"/);
});

test("legacy store accounts are normalized before pricing reads and writes", () => {
  assert.match(store, /function normalizeStoredAccount\(account: StoreAccount\)/);
  assert.match(store, /priceOverrides:\s*Array\.isArray\(account\.priceOverrides\)\s*\?\s*account\.priceOverrides\s*:\s*\[\]/);
  assert.match(api, /function accountPriceOverrides\(account: StoreAccount\)/);
  assert.match(api, /const existingOverrides = accountPriceOverrides\(record\)/);
});

test("direct price edits preserve the editor and save using the confirmed server record", () => {
  assert.match(app, /adminPricingGrid\?\.addEventListener\("input",\s*handleAdminPricingInput\)/);
  const inputHandler = app.match(/function handleAdminPricingInput\(event\)\s*{([\s\S]*?)\n}/)?.[1] || "";
  assert.doesNotMatch(inputHandler, /renderAdminPricingEditor/);
  assert.match(inputHandler, /syncAdminPricingCard/);
  assert.match(app, /state\.adminAccounts\[accountIndex\]\s*=\s*{\s*\.\.\.result\.account/);
  assert.match(html, /id="adminPricingCatalogCount"/);
});
