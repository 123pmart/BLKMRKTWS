import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { loadPublicCatalog } from "@/lib/catalog/server-catalog";
import { buildReorderReview } from "@/lib/orders/reorder";
import { getOrderForVerifiedStore } from "@/lib/orders/store-order-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const verified = await getVerifiedStoreAccount(request);
  if (!verified) return Response.json({ ok: false, message: "Verified store sign-in is required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { id } = await params;
  const order = await getOrderForVerifiedStore(verified.identity, id);
  if (!order) return Response.json({ ok: false, message: "Order not found." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const catalog = await loadPublicCatalog(verified.account);
  return Response.json({ ok: true, review: buildReorderReview(order.lines, catalog.items) }, { headers: { "Cache-Control": "private, no-store" } });
}
