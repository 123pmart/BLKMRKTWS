import { normalizeOrderPayload, readOrders } from "@/api/orders/store.js";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { getAdminIdentity } from "@/lib/admin/auth";
import { adminCanAccessSalesperson, orderSalesperson } from "@/lib/salespeople";
import { repriceOrderPayload } from "@/lib/catalog/pricing";
import { withResolvedOrderImages } from "@/lib/orders/order-images";
import { generateOrderConfirmationPdf } from "@/lib/orders/pdf";
import type { Order } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    let order: Order;
    const adminIdentity = await getAdminIdentity(request);
    if (adminIdentity) {
      const saved = (await readOrders() as Order[]).find((entry) => entry.id === String(payload.id || ""));
      if (saved && !adminCanAccessSalesperson(adminIdentity, orderSalesperson(saved))) {
        return Response.json({ ok: false, message: "Order not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
      }
      order = saved || normalizeOrderPayload(await repriceOrderPayload(payload, null)) as Order;
    } else {
      const storeAccount = await getVerifiedStoreAccount(request);
      order = normalizeOrderPayload({ ...(await repriceOrderPayload(payload, storeAccount?.identity ?? null, storeAccount?.account)), id: payload.id, date: payload.date }) as Order;
    }
    order = await withResolvedOrderImages(order);
    const bytes = await generateOrderConfirmationPdf(order);
    return pdfResponse(bytes, order);
  } catch (error) {
    console.error("Order PDF generation failed:", error);
    return Response.json({ ok: false, message: "The order PDF could not be generated." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

function pdfResponse(bytes: Uint8Array, order: Order): Response {
  const name = `blackmarket-order-${order.id.replace(/[^a-z0-9_-]+/gi, "-")}.pdf`;
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${name}"`,
    "Cache-Control": "private, no-store",
  } });
}
