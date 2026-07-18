import "server-only";

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/admin/session-policy";
import type { AdminIdentity } from "@/types";

const ADMIN_COOKIE = "bm_admin_session";

export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASS);
}

export function verifyAdminCredentials(username: string, password: string): AdminIdentity | null {
  const normalized = username.trim().toLowerCase();
  const expectedUser = process.env.ADMIN_USER || "pmart";
  const expectedPassword = process.env.ADMIN_PASS;
  if (expectedPassword && safeEqual(normalized, expectedUser.toLowerCase()) && safeEqual(password, expectedPassword)) {
    return { username: expectedUser, displayName: "Parker", salesperson: "parker", scope: "all" };
  }
  const staff = STAFF_ADMINS[normalized];
  if (!staff || !verifyStaffPassword(password, staff)) return null;
  return { username: normalized, displayName: staff.displayName, salesperson: staff.salesperson, scope: "own" };
}

export async function setAdminSession(identity: AdminIdentity): Promise<void> {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ role: "admin", exp: expiresAt, identity })).toString("base64url");
  const signature = sign(payload);
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    priority: "high",
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function isAdminRequest(request?: Request): Promise<boolean> {
  return Boolean(await getAdminIdentity(request));
}

export async function getAdminIdentity(request?: Request): Promise<AdminIdentity | null> {
  if (!adminAuthConfigured()) return null;
  const raw = request ? cookieFromHeader(request.headers.get("cookie") || "", ADMIN_COOKIE) : (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string; exp?: number; identity?: AdminIdentity };
    if (parsed.role !== "admin" || Number(parsed.exp) <= Date.now() || !parsed.identity) return null;
    const { username, displayName, salesperson, scope } = parsed.identity;
    if (!username || !displayName || !["parker", "matt", "beau"].includes(salesperson) || !["all", "own"].includes(scope)) return null;
    return { username, displayName, salesperson, scope };
  } catch {
    return null;
  }
}

const STAFF_ADMINS: Record<string, { displayName: string; salesperson: "matt" | "beau"; env: string; salt: string; hash: string }> = {
  beau: { displayName: "Beau", salesperson: "beau", env: "ADMIN_BEAU_PASS", salt: "8f2972fa95a52eb2ce880304b51c7171", hash: "d8c47a5d7d440574a54be81b856e6be6c1156e50a167c2d82f3df824ebb69cdba0e5764e76a7b6c12ee3e1078e17b01af2e8a9f4648d1e0a595fb52c0a5e163d" },
  matt: { displayName: "Matt", salesperson: "matt", env: "ADMIN_MATT_PASS", salt: "3e1a2eb1d581b04a8e49c8d96403bcee", hash: "f47e3789aad93e42ade5e7b7876945f66e1f6b4e21d0fe7ecec14c42d51d7f81463dbfb48fb08f2e3c120d83e6f078c3aa94a07c74601517ef94dc7b02406873" },
};

function verifyStaffPassword(password: string, staff: (typeof STAFF_ADMINS)[string]): boolean {
  const envPassword = process.env[staff.env];
  if (envPassword) return safeEqual(password, envPassword);
  const actual = scryptSync(password, staff.salt, 64);
  return safeEqual(actual.toString("hex"), staff.hash);
}

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASS || "unconfigured";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieFromHeader(header: string, name: string): string | undefined {
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}
