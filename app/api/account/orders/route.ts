import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { AccountProviderUnavailableError, getOrdersForVerifiedStore } from "@/lib/orders/store-order-history";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getVerifiedStoreIdentity();
  if (!identity) {
    return Response.json({ ok: false, code: "AUTH_REQUIRED", message: "Verified store sign-in is required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (identity.status !== "active") {
    return Response.json({ ok: false, code: "ACCOUNT_PENDING", message: "Order history is available after account approval." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const orders = await getOrdersForVerifiedStore(identity);
    return Response.json({ ok: true, orders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AccountProviderUnavailableError) {
      return Response.json({ ok: false, code: "ACCOUNT_PROVIDER_UNAVAILABLE", message: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}
