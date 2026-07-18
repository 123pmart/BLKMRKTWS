import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const subscriptionRoute = await readFile(new URL("../app/api/push/subscription/route.ts", import.meta.url), "utf8");
const sender = await readFile(new URL("../app/lib/push/send.ts", import.meta.url), "utf8");
const orderRoute = await readFile(new URL("../app/api/send-order/route.js", import.meta.url), "utf8");
const contentRoute = await readFile(new URL("../app/api/content/route.js", import.meta.url), "utf8");

test("admin push audience is derived from the verified server session", () => {
  assert.match(subscriptionRoute, /audience === "admin" \? await getAdminIdentity\(request\) : null/);
  assert.match(subscriptionRoute, /audience === "admin" && !adminIdentity/);
  assert.doesNotMatch(subscriptionRoute, /payload\.adminIdentity/);
});

test("Parker receives all scoped orders while staff receive only their salesperson", () => {
  assert.match(sender, /record\.adminIdentity\.scope === "all"/);
  assert.match(sender, /record\.adminIdentity\.salesperson === options\.salesperson/);
});

test("order alerts occur only after durable order persistence", () => {
  const storedAt = orderRoute.indexOf("await upsertOrder(order);");
  const pushedAt = orderRoute.indexOf("await sendPushNotification({");
  assert.ok(storedAt > -1 && pushedAt > storedAt);
  assert.match(orderRoute, /audience: "admin"/);
});

test("news alerts are explicitly customer-only and tied to a persisted announcement", () => {
  const storedAt = contentRoute.indexOf("await writeContent(payload)");
  const pushedAt = contentRoute.indexOf("await sendPushNotification({");
  assert.ok(storedAt > -1 && pushedAt > storedAt);
  assert.match(contentRoute, /audience: "customer"/);
  assert.match(contentRoute, /notificationAnnouncementId/);
});
