import type { AccountSession } from "@/types";

export function isSessionExpired(session: Pick<AccountSession, "expiresAt">, now = Date.now()): boolean {
  return !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now;
}
