import { getVerifiedStoreAccount } from "@/lib/account/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const verified = await getVerifiedStoreAccount(request);
  if (!verified) {
    return Response.json({ ok: true, authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const { account } = verified;
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
