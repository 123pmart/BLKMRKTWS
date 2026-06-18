import { clearOrders, orderStorageMode, readOrders } from "./store.js";

export const runtime = "nodejs";

export async function GET(request) {
  if (!isAdmin(request)) {
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
  if (!isAdmin(request)) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  await clearOrders();
  return Response.json({ ok: true });
}

function isAdmin(request) {
  const password = process.env.ADMIN_PASS || "123pmart";
  return request.headers.get("x-admin-pass") === password;
}
