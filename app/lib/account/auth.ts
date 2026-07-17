import "server-only";

import { getAccountByUsername } from "@/lib/account/account-store";
import { getValidSession, readSessionToken } from "@/lib/account/session";
import type { StoreIdentity } from "@/types";

export async function getVerifiedStoreIdentity(request?: Request): Promise<StoreIdentity | null> {
  const token = await readSessionToken(request);
  if (!token) return null;
  const session = await getValidSession(token);
  if (!session) return null;
  const account = await getAccountByUsername(session.username);
  if (!account || account.id !== session.accountId || account.status === "disabled") return null;
  return {
    accountId: account.id,
    storeId: account.storeId,
    email: account.email,
    username: account.username,
    status: account.status,
  };
}
