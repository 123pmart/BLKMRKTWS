import { normalizeOrderPayload } from "@/api/orders/store.js";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { InvalidOrderPricingError, repriceOrderPayload } from "@/lib/catalog/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const storeAccount = await getVerifiedStoreAccount(request);
    const verified = await repriceOrderPayload(payload, storeAccount?.identity ?? null, storeAccount?.account);
    const order = normalizeOrderPayload({ ...verified, id: payload.id, date: payload.date });
    return Response.json({ ok: true, order }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof InvalidOrderPricingError ? error.message : "Order preview is temporarily unavailable.";
    return Response.json({ ok: false, message }, { status: error instanceof InvalidOrderPricingError ? 400 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
