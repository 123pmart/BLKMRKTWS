import { mkdir, readFile, writeFile } from "node:fs/promises";
import { get, put } from "@vercel/blob";
import os from "node:os";
import path from "node:path";

const STORE_STATE = Symbol.for("blackmarket.wholesale.content");
const BLOB_PATH = "blackmarket/content.json";
const MAX_ANNOUNCEMENTS = 100;
const MAX_CUSTOM_PRODUCTS = 300;

if (!globalThis[STORE_STATE]) {
  globalThis[STORE_STATE] = {
    content: undefined,
    storagePath: null,
  };
}

const memory = globalThis[STORE_STATE];

export async function readContent() {
  if (hasBlobStore()) return readBlobContent();
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
  memory.content = content;

  if (hasBlobStore()) {
    await put(BLOB_PATH, `${JSON.stringify(content, null, 2)}\n`, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return content;
  }

  const paths = memory.storagePath ? [memory.storagePath, ...candidatePaths()] : candidatePaths();
  for (const filePath of paths) {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
      memory.storagePath = filePath;
      return content;
    } catch (error) {
      console.warn(`Unable to write content store at ${filePath}:`, error?.message || error);
    }
  }

  return content;
}

export function normalizeContentPayload(payload = {}) {
  return {
    announcements: cleanEntries(payload.announcements, MAX_ANNOUNCEMENTS),
    customProducts: cleanEntries(payload.customProducts, MAX_CUSTOM_PRODUCTS),
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
  };
}

export function publicContent(content) {
  if (!content) return null;
  return {
    ...content,
    customProducts: content.customProducts.map(({ adminNotes: _adminNotes, ...product }) => product),
  };
}

export function contentStorageMode() {
  if (hasBlobStore()) return "vercel blob";
  return memory.storagePath ? "file" : "memory";
}

async function readBlobContent() {
  try {
    const result = await get(BLOB_PATH, { access: "private" });
    if (result?.statusCode !== 200 || !result.stream) {
      memory.content = null;
      return memory.content;
    }

    memory.content = normalizeContentPayload(JSON.parse(await streamToText(result.stream)));
    return memory.content;
  } catch (error) {
    if (!isBlobNotFound(error)) {
      console.warn("Unable to read Vercel Blob content store:", error?.message || error);
      if (memory.content !== undefined) return memory.content;
      throw error;
    }
    memory.content = null;
    return memory.content;
  }
}

function cleanEntries(entries, maximum) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .slice(0, maximum)
    .map((entry) => JSON.parse(JSON.stringify(entry)));
}

function hasBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToText(stream) {
  return new Response(stream).text();
}

function isBlobNotFound(error) {
  return /not found|404/i.test(String(error?.message || ""));
}

function candidatePaths() {
  return unique([
    process.env.CONTENT_STORE_FILE,
    path.join(process.cwd(), ".blackmarket", "content.json"),
    path.join(os.tmpdir(), "blackmarket-wholesale-content.json"),
  ]);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
