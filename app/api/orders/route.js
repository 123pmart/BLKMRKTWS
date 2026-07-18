import { clearOrders, deleteOrder, orderStorageMode, readOrders, replaceOrders } from "./store.js";
import { getAdminIdentity } from "../../lib/admin/auth.ts";
import { orderSalesperson } from "../../lib/salespeople.ts";

export const runtime = "nodejs";

export async function GET(request) {
  const identity = await getAdminIdentity(request);
  if (!identity) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const allOrders = await readOrders();
  const orders = identity.scope === "all" ? allOrders : allOrders.filter((order) => orderSalesperson(order) === identity.salesperson);
  return Response.json({
    ok: true,
    orders,
    storage: orderStorageMode(),
  });
}

export async function DELETE(request) {
  const identity = await getAdminIdentity(request);
  if (!identity) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const orders = await readOrders();
    const target = orders.find((order) => order.id === id);
    if (!target || (identity.scope !== "all" && orderSalesperson(target) !== identity.salesperson)) {
      return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
    }
    const deleted = await deleteOrder(id);
    return Response.json({ ok: true, deleted });
  }

  if (identity.scope === "all") await clearOrders();
  else {
    const orders = await readOrders();
    await replaceOrders(orders.filter((order) => orderSalesperson(order) !== identity.salesperson));
  }
  return Response.json({ ok: true });
}
