import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { effectivePricingForIdentity } from "@/lib/catalog/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getVerifiedStoreIdentity(request);
  if (!identity || identity.status !== "active") {
    return Response.json({ ok: true, authenticated: false, overrides: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const pricing = await effectivePricingForIdentity(identity);
  return Response.json({ ok: true, authenticated: true, ...pricing }, { headers: { "Cache-Control": "private, no-store" } });
}
