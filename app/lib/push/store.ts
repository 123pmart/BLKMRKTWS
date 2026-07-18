import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { StoredPushSubscription } from "./types";

const SUBSCRIPTION_PREFIX = "blackmarket/push-subscriptions/";
const EVENT_PREFIX = "blackmarket/push-events/";
const LOCAL_ROOT = process.env.PUSH_STORE_DIR || path.join(os.tmpdir(), "blackmarket-wholesale-push-v1");
const VERSIONS_TO_KEEP = 2;

export function pushEndpointHash(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function savePushSubscription(record: StoredPushSubscription): Promise<void> {
  if (canUseBlob()) {
    const { put } = await import("@vercel/blob");
    const pathname = `${SUBSCRIPTION_PREFIX}${record.endpointHash}/${Date.now()}-${randomUUID()}.json`;
    await put(pathname, JSON.stringify(record), {
      access: "private",
      allowOverwrite: false,
      contentType: "application/json",
      cacheControlMaxAge: 31_536_000,
    });
    await pruneBlobVersions(record.endpointHash);
    return;
  }

  const directory = path.join(LOCAL_ROOT, "subscriptions", record.endpointHash);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(record), "utf8");
  await pruneLocalVersions(directory);
}

export async function deactivatePushSubscription(endpoint: string): Promise<void> {
  const current = (await listActivePushSubscriptions()).find((record) => record.subscription.endpoint === endpoint);
  const now = new Date().toISOString();
  await savePushSubscription({
    ...(current || {
      endpointHash: pushEndpointHash(endpoint),
      subscription: { endpoint, expirationTime: null, keys: { auth: "removed", p256dh: "removed" } },
      audience: "customer" as const,
      createdAt: now,
      expiresAt: now,
    }),
    active: false,
    updatedAt: now,
    expiresAt: now,
  });
}

export async function listActivePushSubscriptions(): Promise<StoredPushSubscription[]> {
  const records = canUseBlob() ? await readBlobRecords() : await readLocalRecords();
  const latest = new Map<string, StoredPushSubscription>();
  for (const record of records) {
    if (!isStoredRecord(record)) continue;
    const prior = latest.get(record.endpointHash);
    if (!prior || Date.parse(record.updatedAt) > Date.parse(prior.updatedAt)) latest.set(record.endpointHash, record);
  }
  const now = Date.now();
  return [...latest.values()].filter((record) => record.active && Date.parse(record.expiresAt) > now);
}

export async function claimPushEvent(eventId: string): Promise<boolean> {
  const safeId = createHash("sha256").update(eventId).digest("hex");
  const payload = JSON.stringify({ eventId, claimedAt: new Date().toISOString() });
  if (canUseBlob()) {
    try {
      const { put } = await import("@vercel/blob");
      await put(`${EVENT_PREFIX}${safeId}.json`, payload, {
        access: "private",
        allowOverwrite: false,
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: 31_536_000,
      });
      return true;
    } catch (error) {
      if (isAlreadyExists(error)) return false;
      throw error;
    }
  }

  const directory = path.join(LOCAL_ROOT, "events");
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(path.join(directory, `${safeId}.json`), payload, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

async function readBlobRecords(): Promise<unknown[]> {
  const { get, list } = await import("@vercel/blob");
  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: SUBSCRIPTION_PREFIX, limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const records: unknown[] = [];
  for (let index = 0; index < blobs.length; index += 20) {
    const batch = blobs.slice(index, index + 20);
    const results = await Promise.allSettled(batch.map(async (blob) => {
      const result = await get(blob.pathname, { access: "private" });
      if (result?.statusCode !== 200 || !result.stream) return null;
      return JSON.parse(await new Response(result.stream).text());
    }));
    for (const result of results) if (result.status === "fulfilled" && result.value) records.push(result.value);
  }
  return records;
}

async function readLocalRecords(): Promise<unknown[]> {
  const root = path.join(LOCAL_ROOT, "subscriptions");
  let directories: string[];
  try {
    directories = await readdir(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const records: unknown[] = [];
  for (const directoryName of directories) {
    const directory = path.join(root, directoryName);
    const files = await readdir(directory).catch(() => []);
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      try {
        records.push(JSON.parse(await readFile(path.join(directory, file), "utf8")));
      } catch {
        // Ignore an individual corrupt local development record.
      }
    }
  }
  return records;
}

async function pruneBlobVersions(endpointHash: string): Promise<void> {
  try {
    const { del, list } = await import("@vercel/blob");
    const result = await list({ prefix: `${SUBSCRIPTION_PREFIX}${endpointHash}/`, limit: 1000 });
    const obsolete = [...result.blobs]
      .sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime())
      .slice(VERSIONS_TO_KEEP)
      .map((blob) => blob.pathname);
    if (obsolete.length) await del(obsolete);
  } catch (error) {
    console.warn("Unable to prune old push subscription versions:", error);
  }
}

async function pruneLocalVersions(directory: string): Promise<void> {
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort().reverse();
  await Promise.all(files.slice(VERSIONS_TO_KEEP).map((file) => unlink(path.join(directory, file)).catch(() => undefined)));
}

function isStoredRecord(value: unknown): value is StoredPushSubscription {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<StoredPushSubscription>;
  return Boolean(
    record.endpointHash &&
    record.subscription?.endpoint &&
    record.subscription.keys?.auth &&
    record.subscription.keys?.p256dh &&
    (record.audience === "customer" || record.audience === "admin") &&
    record.createdAt && record.updatedAt && record.expiresAt,
  );
}

function canUseBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);
}

function isAlreadyExists(error: unknown): boolean {
  return /already exists|conflict|409/i.test(String((error as Error)?.message || error));
}
