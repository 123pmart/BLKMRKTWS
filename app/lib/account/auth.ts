import "server-only";

import { getAccountByUsername } from "@/lib/account/account-store";
import { clearAccountSession, getValidSession, readSessionToken } from "@/lib/account/session";
import type { AccountSession, StoreAccount, StoreIdentity } from "@/types";

export interface VerifiedStoreAccount {
  account: StoreAccount;
  identity: StoreIdentity;
  session: AccountSession;
}

export async function getVerifiedStoreAccount(request?: Request): Promise<VerifiedStoreAccount | null> {
  const token = await readSessionToken(request);
  if (!token) return null;
  const session = await getValidSession(token);
  if (!session) return null;
  const account = await getAccountByUsername(session.username);
  if (!account || account.id !== session.accountId || account.status !== "active") {
    await clearAccountSession(token).catch(() => undefined);
    return null;
  }
  return {
    account,
    session,
    identity: {
      accountId: account.id,
      storeId: account.storeId,
      email: account.email,
      username: account.username,
      status: account.status,
    },
  };
}

export async function getVerifiedStoreIdentity(request?: Request): Promise<StoreIdentity | null> {
  return (await getVerifiedStoreAccount(request))?.identity ?? null;
}
