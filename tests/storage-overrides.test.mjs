import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("explicit local content and order paths are authoritative", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blackmarket-storage-test-"));
  const previousContentPath = process.env.CONTENT_STORE_FILE;
  const previousOrderPath = process.env.ORDER_STORE_FILE;
  process.env.CONTENT_STORE_FILE = path.join(directory, "content.json");
  process.env.ORDER_STORE_FILE = path.join(directory, "orders.json");

  try {
    const contentStore = await import(`../app/api/content/store.js?test=${Date.now()}`);
    await contentStore.writeContent({
      announcements: [{ id: "isolated", title: "Isolated" }],
      customProducts: [], hiddenVariants: [], variantOverrides: {},
    });

    const orderStore = await import(`../app/api/orders/store.js?test=${Date.now()}`);
    const order = orderStore.normalizeOrderPayload({
      id: "isolated-order",
      store: {},
      lines: [{ variantId: "isolated", qty: 1, wholesale: "$10.00" }],
    });
    await orderStore.upsertOrder(order);

    assert.equal(JSON.parse(await readFile(process.env.CONTENT_STORE_FILE, "utf8")).announcements[0].id, "isolated");
    assert.equal(JSON.parse(await readFile(process.env.ORDER_STORE_FILE, "utf8")).orders[0].id, "isolated-order");
  } finally {
    if (previousContentPath === undefined) delete process.env.CONTENT_STORE_FILE;
    else process.env.CONTENT_STORE_FILE = previousContentPath;
    if (previousOrderPath === undefined) delete process.env.ORDER_STORE_FILE;
    else process.env.ORDER_STORE_FILE = previousOrderPath;
    await rm(directory, { recursive: true, force: true });
  }
});
