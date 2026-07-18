import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { refreshAccountSessionIfNeeded } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const verified = await getVerifiedStoreAccount(request);
  if (!verified) {
    return Response.json({ ok: true, authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const { account, session } = verified;
  await refreshAccountSessionIfNeeded(session);
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
