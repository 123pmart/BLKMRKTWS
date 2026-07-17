import { clearOrders, deleteOrder, orderStorageMode, readOrders } from "./store.js";
import { isAdminRequest } from "../../lib/admin/auth.ts";

export const runtime = "nodejs";

export async function GET(request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const orders = await readOrders();
  return Response.json({
    ok: true,
    orders,
    storage: orderStorageMode(),
  });
}

export async function DELETE(request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const deleted = await deleteOrder(id);
    return Response.json({ ok: true, deleted });
  }

  await clearOrders();
  return Response.json({ ok: true });
}
