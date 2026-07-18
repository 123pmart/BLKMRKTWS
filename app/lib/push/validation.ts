import type { BrowserPushSubscription, PushAudience } from "./types";

const BASE64_URL = /^[A-Za-z0-9_-]+$/;

export function isPushAudience(value: unknown): value is PushAudience {
  return value === "customer" || value === "admin";
}

export function normalizeBrowserPushSubscription(value: unknown): BrowserPushSubscription | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const endpoint = cleanString(candidate.endpoint, 2048);
  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return null;
  }
  if (parsedEndpoint.protocol !== "https:") return null;

  const rawKeys = candidate.keys;
  if (!rawKeys || typeof rawKeys !== "object" || Array.isArray(rawKeys)) return null;
  const keys = rawKeys as Record<string, unknown>;
  const auth = cleanString(keys.auth, 256);
  const p256dh = cleanString(keys.p256dh, 256);
  if (!isValidKey(auth, 12) || !isValidKey(p256dh, 64)) return null;

  const rawExpiration = candidate.expirationTime;
  const expirationTime = rawExpiration == null ? null : Number(rawExpiration);
  if (expirationTime !== null && (!Number.isFinite(expirationTime) || expirationTime <= Date.now())) return null;

  return { endpoint, expirationTime, keys: { auth, p256dh } };
}

export function cleanPushText(value: unknown, maximum: number): string {
  return cleanString(value, maximum).replace(/[<>]/g, "");
}

function isValidKey(value: string, minimum: number): boolean {
  return value.length >= minimum && BASE64_URL.test(value);
}

function cleanString(value: unknown, maximum: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}
