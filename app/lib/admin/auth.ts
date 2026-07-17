import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "bm_admin_session";
const ADMIN_MAX_AGE = 60 * 60 * 8;

export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASS);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER || "pmart";
  const expectedPassword = process.env.ADMIN_PASS;
  if (!expectedPassword) return false;
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}

export async function setAdminSession(): Promise<void> {
  const expiresAt = Date.now() + ADMIN_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ role: "admin", exp: expiresAt })).toString("base64url");
  const signature = sign(payload);
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
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
  if (!adminAuthConfigured()) return false;
  const raw = request ? cookieFromHeader(request.headers.get("cookie") || "", ADMIN_COOKIE) : (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string; exp?: number };
    return parsed.role === "admin" && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
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
