import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { getOrderForVerifiedStore } from "@/lib/orders/store-order-history";
import { generateOrderConfirmationPdf } from "@/lib/orders/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getVerifiedStoreIdentity(request);
  if (!identity || identity.status !== "active") return Response.json({ ok: false, message: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const savedOrder = await getOrderForVerifiedStore(identity, decodeURIComponent((await params).id));
  if (!savedOrder) return Response.json({ ok: false, message: "Order not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const order = savedOrder;
  const bytes = await generateOrderConfirmationPdf(order);
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="blackmarket-order-${order.id.replace(/[^a-z0-9_-]+/gi, "-")}.pdf"`,
    "Cache-Control": "private, no-store",
  } });
}
