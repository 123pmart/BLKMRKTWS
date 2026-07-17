import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { AccountSession, StoreAccount } from "@/types";

const ACCOUNT_PREFIX = "blackmarket/accounts/";
const SESSION_PREFIX = "blackmarket/account-sessions/";

export class AccountStoreUnavailableError extends Error {
  constructor(message = "Secure account storage is unavailable.") {
    super(message);
    this.name = "AccountStoreUnavailableError";
  }
}

export class UsernameConflictError extends Error {
  constructor() {
    super("That username is unavailable.");
    this.name = "UsernameConflictError";
  }
}

export async function createAccount(account: StoreAccount): Promise<StoreAccount> {
  const pathname = accountPath(account.username);
  if (shouldUseBlob()) {
    try {
      const { put } = await import("@vercel/blob");
      await put(pathname, serialize(account), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      return account;
    } catch (error) {
      if (isConflict(error)) throw new UsernameConflictError();
      throw new AccountStoreUnavailableError(messageOf(error));
    }
  }

  ensureLocalAllowed();
  const target = localPath("accounts", `${accountFileName(account.username)}.json`);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await writeFile(target, serialize(account), { encoding: "utf8", flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new UsernameConflictError();
    throw error;
  }
  return account;
}

export async function getAccountByUsername(username: string): Promise<StoreAccount | null> {
  return readRecord<StoreAccount>(accountPath(username), localPath("accounts", `${accountFileName(username)}.json`));
}

export async function getAccountById(accountId: string): Promise<StoreAccount | null> {
  const accounts = await listAccounts();
  return accounts.find((account) => account.id === accountId) ?? null;
}

export async function listAccounts(): Promise<StoreAccount[]> {
  if (shouldUseBlob()) {
    try {
      const { list } = await import("@vercel/blob");
      const results: StoreAccount[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: ACCOUNT_PREFIX, cursor, limit: 1000 });
        const records = await Promise.all(page.blobs.filter((blob) => blob.pathname.endsWith(".json")).map((blob) => readBlob<StoreAccount>(blob.pathname)));
        results.push(...records.filter((record): record is StoreAccount => Boolean(record)));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      throw new AccountStoreUnavailableError(messageOf(error));
    }
  }

  ensureLocalAllowed();
  const directory = localPath("accounts");
  const names = await readdir(directory).catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? [] : Promise.reject(error));
  const accounts = await Promise.all(names.filter((name) => name.endsWith(".json")).map(async (name) => {
    try { return JSON.parse(await readFile(path.join(directory, name), "utf8")) as StoreAccount; } catch { return null; }
  }));
  return accounts.filter((entry): entry is StoreAccount => Boolean(entry)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateAccount(username: string, mutate: (account: StoreAccount) => StoreAccount): Promise<StoreAccount> {
  const pathname = accountPath(username);
  if (shouldUseBlob()) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const { head, put } = await import("@vercel/blob");
        const [account, metadata] = await Promise.all([readBlob<StoreAccount>(pathname), head(pathname)]);
        if (!account) throw new Error("Account not found.");
        const next = mutate(structuredClone(account));
        next.updatedAt = new Date().toISOString();
        await put(pathname, serialize(next), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          ifMatch: metadata.etag,
          contentType: "application/json",
          cacheControlMaxAge: 60,
        });
        return next;
      } catch (error) {
        if (isPrecondition(error) && attempt < 3) continue;
        throw new AccountStoreUnavailableError(messageOf(error));
      }
    }
  }

  ensureLocalAllowed();
  const target = localPath("accounts", `${accountFileName(username)}.json`);
  const account = JSON.parse(await readFile(target, "utf8")) as StoreAccount;
  const next = mutate(structuredClone(account));
  next.updatedAt = new Date().toISOString();
  await atomicWrite(target, serialize(next));
  return next;
}

export async function renameAccountUsername(oldUsername: string, nextUsername: string): Promise<StoreAccount> {
  const account = await getAccountByUsername(oldUsername);
  if (!account) throw new Error("Account not found.");
  const next = { ...account, username: nextUsername, updatedAt: new Date().toISOString() };
  await createAccount(next);
  await deleteRecord(accountPath(oldUsername), localPath("accounts", `${accountFileName(oldUsername)}.json`));
  return next;
}

export async function createSessionRecord(session: AccountSession): Promise<void> {
  const pathname = sessionPath(session.tokenHash);
  if (shouldUseBlob()) {
    try {
      const { put } = await import("@vercel/blob");
      await put(pathname, serialize(session), {
        access: "private", addRandomSuffix: false, allowOverwrite: false,
        contentType: "application/json", cacheControlMaxAge: 60,
      });
      return;
    } catch (error) {
      throw new AccountStoreUnavailableError(messageOf(error));
    }
  }
  ensureLocalAllowed();
  const target = localPath("sessions", `${session.tokenHash}.json`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, serialize(session), { encoding: "utf8", flag: "wx", mode: 0o600 });
}

export async function getSessionRecord(tokenHash: string): Promise<AccountSession | null> {
  return readRecord<AccountSession>(sessionPath(tokenHash), localPath("sessions", `${tokenHash}.json`));
}

export async function deleteSessionRecord(tokenHash: string): Promise<void> {
  await deleteRecord(sessionPath(tokenHash), localPath("sessions", `${tokenHash}.json`));
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newStoreId(): string { return `store_${randomUUID()}`; }
export function newAccountId(): string { return `acct_${randomUUID()}`; }

async function readRecord<T>(pathname: string, localFile: string): Promise<T | null> {
  if (shouldUseBlob()) {
    try { return await readBlob<T>(pathname); }
    catch (error) { throw new AccountStoreUnavailableError(messageOf(error)); }
  }
  ensureLocalAllowed();
  try { return JSON.parse(await readFile(localFile, "utf8")) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readBlob<T>(pathname: string): Promise<T | null> {
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: "private" });
    if (result?.statusCode !== 200 || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text()) as T;
  } catch (error) {
    if (/not found|404/i.test(messageOf(error))) return null;
    throw error;
  }
}

async function deleteRecord(pathname: string, localFile: string): Promise<void> {
  if (shouldUseBlob()) {
    const { del } = await import("@vercel/blob");
    await del(pathname);
    return;
  }
  ensureLocalAllowed();
  await unlink(localFile).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}

async function atomicWrite(target: string, body: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, body, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

function accountPath(username: string): string { return `${ACCOUNT_PREFIX}${accountFileName(username)}.json`; }
function sessionPath(hash: string): string { return `${SESSION_PREFIX}${hash}.json`; }
function accountFileName(username: string): string { return encodeURIComponent(username.toLowerCase()); }
function serialize(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }
function shouldUseBlob(): boolean { return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL || process.env.VERCEL_ENV); }
function isProductionRuntime(): boolean {
  if (process.env.VERCEL || process.env.VERCEL_ENV) return true;
  return process.env.NODE_ENV === "production" && !process.env.ACCOUNT_STORE_DIR;
}
function ensureLocalAllowed(): void {
  if (isProductionRuntime()) throw new AccountStoreUnavailableError("Vercel Blob is required for production store accounts.");
}
function localPath(...parts: string[]): string {
  const defaultRoot = path.join(os.tmpdir(), "blackmarket-wholesale-accounts-v2");
  return path.join(process.env.ACCOUNT_STORE_DIR || defaultRoot, ...parts);
}
function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function isConflict(error: unknown): boolean { return /already exists|409|overwrite/i.test(messageOf(error)); }
function isPrecondition(error: unknown): boolean { return /precondition|etag|412/i.test(messageOf(error)); }
