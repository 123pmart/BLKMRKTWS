import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const STORE_STATE = Symbol.for("blackmarket.wholesale.orders");
const MAX_ORDERS = 500;
const BLOB_PATH = "blackmarket/orders.json";

if (!globalThis[STORE_STATE]) {
  globalThis[STORE_STATE] = {
    orders: null,
    storagePath: null,
    blobAvailable: null,
  };
}

const memory = globalThis[STORE_STATE];

export async function readOrders() {
  if (canAttemptBlobStore() && memory.blobAvailable !== false) {
    try {
      const orders = await readBlobOrders();
      memory.blobAvailable = true;
      return orders;
    } catch (error) {
      memory.blobAvailable = false;
      console.warn("Vercel Blob order storage is unavailable; using a temporary fallback:", error?.message || error);
    }
  }
  if (Array.isArray(memory.orders)) return memory.orders;

  for (const filePath of candidatePaths()) {
    try {
      const raw = await readFile(filePath, "utf8");
      const data = JSON.parse(raw);
      memory.orders = Array.isArray(data.orders) ? data.orders : [];
      memory.storagePath = filePath;
      return memory.orders;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.warn(`Unable to read order store at ${filePath}:`, error?.message || error);
      }
    }
  }

  memory.orders = [];
  return memory.orders;
}

export async function upsertOrder(order) {
  const orders = await readOrders();
  const next = [order, ...orders.filter((entry) => entry.id !== order.id)].slice(0, MAX_ORDERS);
  await writeOrders(next);
  return order;
}

export async function clearOrders() {
  await writeOrders([]);
}

export function normalizeOrderPayload(payload = {}) {
  const now = new Date().toISOString();
  const lines = Array.isArray(payload.lines) ? payload.lines.map(normalizeLine).filter(Boolean) : [];
  const totals = normalizeTotals(payload.totals, lines);

  return {
    id: cleanString(payload.id) || `bmw-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
    date: cleanString(payload.date) || now,
    status: cleanString(payload.status) || "new",
    store: normalizeStore(payload.store || {}),
    lines,
    totals,
    delivery: payload.delivery && typeof payload.delivery === "object" ? payload.delivery : {},
  };
}

export function validateOrder(order) {
  if (!order.store || !Array.isArray(order.lines) || !order.lines.length) {
    return "Order is missing store information or items.";
  }

  const required = ["storeName", "contactName", "phone", "email", "street", "city", "state", "zip"];
  const missing = required.filter((key) => !cleanString(order.store[key]));
  if (missing.length) return `Missing required fields: ${missing.join(", ")}`;

  if (!String(order.store.email).includes("@")) return "Enter a valid email address.";
  if (!order.totals.units || order.totals.units <= 0) return "Order must include at least one item.";
  return "";
}

export function orderStorageMode() {
  if (memory.blobAvailable === true) return "vercel blob";
  if (isVercelRuntime()) return "temporary fallback";
  return memory.storagePath ? "file" : "memory";
}

async function writeOrders(orders) {
  memory.orders = orders;
  if (canAttemptBlobStore() && memory.blobAvailable !== false) {
    try {
      await writeBlobOrders(orders);
      memory.blobAvailable = true;
      return;
    } catch (error) {
      memory.blobAvailable = false;
      console.warn("Unable to write Vercel Blob order store; using a temporary fallback:", error?.message || error);
    }
  }

  const paths = memory.storagePath ? [memory.storagePath, ...candidatePaths()] : candidatePaths();

  for (const filePath of paths) {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify({ orders }, null, 2)}\n`, "utf8");
      memory.storagePath = filePath;
      return;
    } catch (error) {
      console.warn(`Unable to write order store at ${filePath}:`, error?.message || error);
    }
  }
}

async function readBlobOrders() {
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(BLOB_PATH, { access: "private" });
    if (result?.statusCode !== 200 || !result.stream) {
      memory.orders = [];
      return memory.orders;
    }

    const data = JSON.parse(await streamToText(result.stream));
    memory.orders = Array.isArray(data.orders) ? data.orders : [];
    return memory.orders;
  } catch (error) {
    if (!isBlobNotFound(error)) {
      console.warn("Unable to read Vercel Blob order store:", error?.message || error);
      throw error;
    }
    memory.orders = [];
    return memory.orders;
  }
}

async function writeBlobOrders(orders) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, `${JSON.stringify({ orders }, null, 2)}\n`, {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

function canAttemptBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || isVercelRuntime());
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);
}

async function streamToText(stream) {
  const response = new Response(stream);
  return response.text();
}

function isBlobNotFound(error) {
  const message = String(error?.message || "");
  return /not found|404/i.test(message);
}

function candidatePaths() {
  return unique([
    process.env.ORDER_STORE_FILE,
    path.join(process.cwd(), ".blackmarket", "orders.json"),
    path.join(os.tmpdir(), "blackmarket-wholesale-orders.json"),
  ]);
}

function normalizeStore(store) {
  return {
    storeName: cleanString(store.storeName),
    contactName: cleanString(store.contactName),
    phone: cleanString(store.phone),
    email: cleanString(store.email).toLowerCase(),
    street: cleanString(store.street),
    city: cleanString(store.city),
    state: cleanString(store.state).toUpperCase(),
    zip: cleanString(store.zip),
    notes: cleanString(store.notes, 1200),
  };
}

function normalizeLine(line) {
  if (!line || typeof line !== "object") return null;
  const qty = Math.max(0, Math.floor(Number(line.qty || 0)));
  if (!qty) return null;

  const lineWholesale = Number(line.lineWholesale || parseMoney(line.wholesale) * qty || 0);
  const lineMap = Number(line.lineMap || parseMoney(line.map) * qty || 0);
  return {
    product: cleanString(line.product),
    flavor: cleanString(line.flavor),
    item: cleanString(line.item),
    upc: cleanString(line.upc),
    wholesale: cleanString(line.wholesale),
    map: cleanString(line.map),
    qty,
    lineWholesale,
    lineMap,
  };
}

function normalizeTotals(totals = {}, lines = []) {
  const calculated = lines.reduce(
    (sum, line) => {
      sum.units += Number(line.qty || 0);
      sum.wholesale += Number(line.lineWholesale || 0);
      sum.map += Number(line.lineMap || 0);
      return sum;
    },
    { units: 0, wholesale: 0, map: 0 },
  );

  return {
    units: Number(totals.units || calculated.units || 0),
    wholesale: Number(totals.wholesale || calculated.wholesale || 0),
    map: Number(totals.map || calculated.map || 0),
  };
}

function cleanString(value, maxLength = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseMoney(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
