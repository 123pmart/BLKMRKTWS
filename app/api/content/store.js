import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const STORE_STATE = Symbol.for("blackmarket.wholesale.content");
const BLOB_PATH = "blackmarket/content.json";
const MAX_ANNOUNCEMENTS = 100;
const MAX_CUSTOM_PRODUCTS = 300;
const MAX_HIDDEN_VARIANTS = 1000;
const MAX_VARIANT_OVERRIDES = 1500;
const MAX_ASSISTANT_KNOWLEDGE = 100;
const BLOB_READ_TIMEOUT_MS = 5000;

if (!globalThis[STORE_STATE]) {
  globalThis[STORE_STATE] = {
    content: undefined,
    storagePath: null,
    blobAvailable: null,
  };
}

const memory = globalThis[STORE_STATE];

export async function readContent() {
  if (canAttemptBlobStore() && memory.blobAvailable !== false) {
    try {
      const content = await readBlobContent();
      memory.blobAvailable = true;
      return content;
    } catch (error) {
      memory.blobAvailable = false;
      console.warn("Vercel Blob content storage is unavailable; using a temporary fallback:", error?.message || error);
    }
  }
  if (memory.content !== undefined) return memory.content;

  for (const filePath of candidatePaths()) {
    try {
      const raw = await readFile(filePath, "utf8");
      memory.content = normalizeContentPayload(JSON.parse(raw));
      memory.storagePath = filePath;
      return memory.content;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.warn(`Unable to read content store at ${filePath}:`, error?.message || error);
      }
    }
  }

  memory.content = null;
  return memory.content;
}

export async function writeContent(payload) {
  const content = normalizeContentPayload(payload);

  // Writes always retry Blob. A previous transient read/write failure must not
  // permanently demote a warm server instance to temporary storage.
  if (canAttemptBlobStore()) {
    try {
      const { put } = await import("@vercel/blob");
      await put(BLOB_PATH, `${JSON.stringify(content, null, 2)}\n`, {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      memory.blobAvailable = true;
      memory.content = content;
      return content;
    } catch (error) {
      memory.blobAvailable = false;
      console.error("Unable to write Vercel Blob content store:", error?.message || error);
      if (isVercelRuntime()) {
        throw new Error("Durable content storage is unavailable. No production fallback was written.", { cause: error });
      }
    }
  }

  const paths = memory.storagePath ? [memory.storagePath, ...candidatePaths()] : candidatePaths();
  for (const filePath of paths) {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
      memory.storagePath = filePath;
      memory.content = content;
      return content;
    } catch (error) {
      console.warn(`Unable to write content store at ${filePath}:`, error?.message || error);
    }
  }

  throw new Error("Unable to persist portal content.");
}

export function normalizeContentPayload(payload = {}) {
  return {
    maintenanceMode: typeof payload.maintenanceMode === "boolean" ? payload.maintenanceMode : true,
    announcements: cleanEntries(payload.announcements, MAX_ANNOUNCEMENTS),
    customProducts: cleanEntries(payload.customProducts, MAX_CUSTOM_PRODUCTS),
    hiddenVariants: cleanStrings(payload.hiddenVariants, MAX_HIDDEN_VARIANTS),
    variantOverrides: cleanVariantOverrides(payload.variantOverrides, MAX_VARIANT_OVERRIDES),
    assistantKnowledge: cleanEntries(payload.assistantKnowledge, MAX_ASSISTANT_KNOWLEDGE),
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
  };
}

export function publicContent(content) {
  if (!content) return null;
  const publicPayload = {
    ...content,
    customProducts: content.customProducts.map((entry) => {
      const product = { ...entry };
      delete product.adminNotes;
      return product;
    }),
  };
  delete publicPayload.assistantKnowledge;
  return publicPayload;
}

export function contentStorageMode() {
  if (memory.blobAvailable === true) return "vercel blob";
  if (isVercelRuntime()) return "temporary fallback";
  return memory.storagePath ? "file" : "memory";
}

async function readBlobContent() {
  try {
    const { get } = await import("@vercel/blob");
    const result = await withTimeout(
      get(BLOB_PATH, { access: "private" }),
      BLOB_READ_TIMEOUT_MS,
      "Vercel Blob content read timed out.",
    );
    if (result?.statusCode !== 200 || !result.stream) {
      memory.content = null;
      return memory.content;
    }

    memory.content = normalizeContentPayload(JSON.parse(await streamToText(result.stream)));
    return memory.content;
  } catch (error) {
    if (!isBlobNotFound(error)) {
      console.warn("Unable to read Vercel Blob content store:", error?.message || error);
      throw error;
    }
    memory.content = null;
    return memory.content;
  }
}

async function withTimeout(promise, milliseconds, message) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function cleanEntries(entries, maximum) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .slice(0, maximum)
    .map((entry) => JSON.parse(JSON.stringify(entry)));
}

function cleanStringArray(entries, maximum) {
  if (!Array.isArray(entries)) return [];
  return unique(
    entries
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
  ).slice(0, maximum);
}

function cleanStrings(entries, maximum) {
  if (!Array.isArray(entries)) return [];
  return unique(entries.map((entry) => String(entry || "").trim()).filter(Boolean)).slice(0, maximum);
}

function cleanVariantOverrides(overrides, maximum) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return {};
  return Object.fromEntries(
    Object.entries(overrides)
      .slice(0, maximum)
      .map(([id, override]) => {
        if (!override || typeof override !== "object" || Array.isArray(override)) return null;
        const clean = {};
        if (["available", "coming-soon", "inactive"].includes(override.status)) clean.status = override.status;
        if (typeof override.limitedEdition === "boolean") clean.limitedEdition = override.limitedEdition;
        if (typeof override.runningLow === "boolean") clean.runningLow = override.runningLow;
        if (override.bottle) clean.bottle = String(override.bottle).trim();
        if (override.panel) clean.panel = String(override.panel).trim();
        const images = cleanStringArray(override.images, 16);
        if (images.length) clean.images = images;
        const cleanId = String(id || "").trim();
        return cleanId && Object.keys(clean).length ? [cleanId, clean] : null;
      })
      .filter(Boolean),
  );
}

function canAttemptBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || isVercelRuntime());
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);
}

async function streamToText(stream) {
  return new Response(stream).text();
}

function isBlobNotFound(error) {
  return /not found|404/i.test(String(error?.message || ""));
}

function candidatePaths() {
  if (process.env.CONTENT_STORE_FILE) return [process.env.CONTENT_STORE_FILE];
  return unique([
    path.join(process.cwd(), ".blackmarket", "content.json"),
    path.join(os.tmpdir(), "blackmarket-wholesale-content.json"),
  ]);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
