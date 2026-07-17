import { getAccountById } from "@/lib/account/account-store";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getVerifiedStoreIdentity(request);
  if (!identity) {
    return Response.json({ ok: true, authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const account = await getAccountById(identity.accountId);
  if (!account) {
    return Response.json({ ok: true, authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return Response.json({
    ok: true,
    authenticated: true,
    account: {
      username: account.username,
      status: account.status,
      storeName: account.store.storeName,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
