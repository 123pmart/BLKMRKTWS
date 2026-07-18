import test from "node:test";
import assert from "node:assert/strict";

import { hashPassword, verifyPassword } from "../app/lib/account/password.ts";
import {
  isSessionExpired,
  shouldRefreshSession,
  STORE_SESSION_MAX_AGE_SECONDS,
} from "../app/lib/account/session-policy.ts";
import { validateRegistration } from "../app/lib/account/validation.ts";
import { canAccessStoreOrder } from "../app/lib/orders/authorization.ts";
import { adminCanAccessSalesperson, normalizeSalesperson, orderSalesperson } from "../app/lib/salespeople.ts";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "../app/lib/admin/session-policy.ts";

test("passwords are salted, hashed, and verified without plaintext storage", async () => {
  const first = await hashPassword("StrongPassword42");
  const second = await hashPassword("StrongPassword42");
  assert.notEqual(first, second);
  assert.equal(first.includes("StrongPassword42"), false);
  assert.equal(await verifyPassword("StrongPassword42", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
});

test("session expiration rejects expired and malformed timestamps", () => {
  assert.equal(isSessionExpired({ expiresAt: "2026-01-01T00:00:00.000Z" }, Date.parse("2026-01-02T00:00:00.000Z")), true);
  assert.equal(isSessionExpired({ expiresAt: "2026-01-03T00:00:00.000Z" }, Date.parse("2026-01-02T00:00:00.000Z")), false);
  assert.equal(isSessionExpired({ expiresAt: "invalid" }), true);
});

test("store sessions persist for six months and refresh before expiration", () => {
  assert.equal(STORE_SESSION_MAX_AGE_SECONDS, 60 * 60 * 24 * 180);
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  assert.equal(shouldRefreshSession({ expiresAt: "2026-01-20T00:00:00.000Z" }, now), true);
  assert.equal(shouldRefreshSession({ expiresAt: "2026-05-01T00:00:00.000Z" }, now), false);
  assert.equal(shouldRefreshSession({ expiresAt: "2025-12-31T00:00:00.000Z" }, now), false);
});

test("admin sessions persist for thirty days", () => {
  assert.equal(ADMIN_SESSION_MAX_AGE_SECONDS, 60 * 60 * 24 * 30);
});

test("registration validation normalizes usernames and rejects weak input", () => {
  const valid = validateRegistration({ storeName: "Test Store", contactName: "Buyer Name", email: "BUYER@EXAMPLE.COM", username: " Buyer.Name ", password: "SecurePass123", confirmPassword: "SecurePass123", salesperson: "matt" });
  assert.equal(valid.ok, true);
  assert.equal(valid.value?.username, "buyer.name");
  assert.equal(valid.value?.email, "buyer@example.com");
  const invalid = validateRegistration({ storeName: "", contactName: "", email: "bad", username: "x", password: "short", confirmPassword: "different" });
  assert.equal(invalid.ok, false);
  assert.ok(Object.keys(invalid.errors).length >= 5);
});

test("order authorization requires active approval and denies pending, disabled, and cross-store access", () => {
  const identity = { accountId: "a", storeId: "store-a", email: "a@example.com", username: "a", status: "active" };
  assert.equal(canAccessStoreOrder(identity, { storeId: "store-a" }), true);
  assert.equal(canAccessStoreOrder(identity, { storeId: "store-b" }), false);
  assert.equal(canAccessStoreOrder(identity, {}), false);
  assert.equal(canAccessStoreOrder({ ...identity, status: "pending" }, { storeId: "store-a" }), false);
  assert.equal(canAccessStoreOrder({ ...identity, status: "disabled" }, { storeId: "store-a" }), false);
});

test("Parker sees every salesperson while Matt and Beau are isolated to their own orders", () => {
  const parker = { username: "pmart", displayName: "Parker", salesperson: "parker", scope: "all" };
  const matt = { username: "matt", displayName: "Matt", salesperson: "matt", scope: "own" };
  const beau = { username: "beau", displayName: "Beau", salesperson: "beau", scope: "own" };
  assert.equal(normalizeSalesperson(undefined), "parker");
  assert.equal(orderSalesperson({ store: {} }), "parker");
  assert.equal(orderSalesperson({ salesperson: "beau", store: {} }), "beau");
  assert.equal(adminCanAccessSalesperson(parker, "beau"), true);
  assert.equal(adminCanAccessSalesperson(parker, "matt"), true);
  assert.equal(adminCanAccessSalesperson(parker, "parker"), true);
  assert.equal(adminCanAccessSalesperson(matt, "matt"), true);
  assert.equal(adminCanAccessSalesperson(matt, "beau"), false);
  assert.equal(adminCanAccessSalesperson(beau, "beau"), true);
  assert.equal(adminCanAccessSalesperson(beau, "matt"), false);
});
