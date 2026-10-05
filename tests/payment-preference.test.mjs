import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");
const client = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const emailRoute = await readFile(new URL("../app/api/send-order/route.js", import.meta.url), "utf8");
const serverPdf = await readFile(new URL("../app/lib/orders/pdf.ts", import.meta.url), "utf8");
const orderStore = await import(`../app/api/orders/store.js?payment=${Date.now()}`);

test("checkout clearly encourages secure card setup without collecting card data", () => {
  assert.match(html, /<span>Credit card on file<\/span>/);
  assert.match(html, /Preferred for first orders/);
  assert.match(html, /This is optional/);
  assert.match(html, /never enter card numbers here/i);
  assert.match(html, /name="paymentPreference" value="contact-to-add"/);
  assert.match(html, /name="paymentPreference" value="on-file"/);
  assert.match(html, /name="paymentPreference" value="not-now"/);
  assert.doesNotMatch(html, /name="(?:cardNumber|cvv|cvc|expiration|expiry)"/i);
  assert.doesNotMatch(html, /autocomplete="cc-/i);
});

test("payment choices remain optional, readable, and touch friendly", () => {
  assert.doesNotMatch(html, /name="paymentPreference"[^>]*required/);
  assert.match(styles, /\.payment-option \{[^}]*min-height: 52px/);
  assert.match(styles, /\.payment-option input \{[^}]*width: 18px/);
  assert.match(client, /Object\.fromEntries\(new FormData\(dom\.storeForm\)\.entries\(\)\)/);
});

test("order normalization stores only an allowlisted preference and drops submitted card-like fields", () => {
  const base = {
    storeName: "First Store", contactName: "Buyer", phone: "555-0100", email: "buyer@example.com",
    street: "1 Main", city: "West Valley", state: "UT", zip: "84120", salesperson: "parker",
  };
  for (const preference of ["contact-to-add", "on-file", "not-now"]) {
    const order = orderStore.normalizeOrderPayload({ store: { ...base, paymentPreference: preference, cardNumber: "4111111111111111", cvv: "123" }, lines: [] });
    assert.equal(order.store.paymentPreference, preference);
    assert.equal("cardNumber" in order.store, false);
    assert.equal("cvv" in order.store, false);
  }
  assert.equal(orderStore.normalizeOrderPayload({ store: { ...base, paymentPreference: "unexpected" }, lines: [] }).store.paymentPreference, "not-provided");
  assert.equal(orderStore.normalizeOrderPayload({ store: base, lines: [] }).store.paymentPreference, "not-provided");
});

test("the preference reaches admin, email, customer history, and both PDF paths", async () => {
  const historyPage = await readFile(new URL("../app/account/orders/[id]/page.tsx", import.meta.url), "utf8");
  for (const source of [client, emailRoute, historyPage, serverPdf]) assert.match(source, /Card on file|CARD ON FILE/);
  assert.match(client, /renderAdminOrderField\("Card on file"/);
  assert.match(emailRoute, /paymentPreferenceLabel\(store\.paymentPreference\)/);
  assert.match(client, /paymentPreferencePdfLabel\(store\.paymentPreference\)/);
});
