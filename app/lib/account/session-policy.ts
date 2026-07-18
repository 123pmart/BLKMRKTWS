import type { AccountSession } from "@/types";

export const STORE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const STORE_SESSION_REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 30;

export function isSessionExpired(session: Pick<AccountSession, "expiresAt">, now = Date.now()): boolean {
  return !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now;
}

export function shouldRefreshSession(session: Pick<AccountSession, "expiresAt">, now = Date.now()): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt)
    && expiresAt > now
    && expiresAt - now <= STORE_SESSION_REFRESH_WINDOW_SECONDS * 1000;
}
