import { getVerifiedStoreAccount } from "@/lib/account/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const verified = await getVerifiedStoreAccount(request);
  if (!verified || verified.identity.status !== "active") {
    return Response.json({ ok: true, authenticated: false, overrides: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return Response.json({ ok: true, authenticated: true, overrides: verified.account.priceOverrides }, { headers: { "Cache-Control": "private, no-store" } });
}
