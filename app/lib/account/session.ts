import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { createSessionRecord, deleteSessionRecord, getSessionRecord, hashSessionToken } from "@/lib/account/account-store";
import { isSessionExpired, shouldRefreshSession, STORE_SESSION_MAX_AGE_SECONDS } from "@/lib/account/session-policy";
import type { AccountSession } from "@/types";

export const STORE_SESSION_COOKIE = "bm_store_session";

export async function createAccountSession(accountId: string, username: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const session: AccountSession = {
    id: `session_${randomUUID()}`,
    tokenHash: hashSessionToken(token),
    accountId,
    username,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + STORE_SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
  };
  await createSessionRecord(session);
  return token;
}

export async function setAccountSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(STORE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STORE_SESSION_MAX_AGE_SECONDS,
    priority: "high",
  });
}

export async function clearAccountSession(token?: string | null): Promise<void> {
  if (token) await deleteSessionRecord(hashSessionToken(token)).catch(() => undefined);
  const jar = await cookies();
  jar.set(STORE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken(request?: Request): Promise<string | null> {
  if (request) return parseCookie(request.headers.get("cookie") || "", STORE_SESSION_COOKIE);
  return (await cookies()).get(STORE_SESSION_COOKIE)?.value ?? null;
}

export async function getValidSession(token: string): Promise<AccountSession | null> {
  const session = await getSessionRecord(hashSessionToken(token));
  if (!session) return null;
  if (isSessionExpired(session)) {
    await deleteSessionRecord(session.tokenHash).catch(() => undefined);
    return null;
  }
  return session;
}

export async function refreshAccountSessionIfNeeded(session: AccountSession): Promise<boolean> {
  if (!shouldRefreshSession(session)) return false;
  const token = await createAccountSession(session.accountId, session.username);
  await setAccountSessionCookie(token);
  await deleteSessionRecord(session.tokenHash).catch(() => undefined);
  return true;
}

function parseCookie(header: string, name: string): string | null {
  const entry = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}
