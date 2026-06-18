import { normalizeOrderPayload, upsertOrder, validateOrder } from "../orders/store.js";

const ORDER_TO_EMAIL = process.env.ORDER_TO_EMAIL || "pmart@blackmarketlabs.com";
const ORDER_FROM_EMAIL = process.env.ORDER_FROM_EMAIL || "BLACKMARKET Wholesale <orders@blackmarketlabs.com>";

export const runtime = "nodejs";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const order = normalizeOrderPayload(payload);
  const validationError = validateOrder(order);
  if (validationError) {
    return Response.json({ ok: false, message: validationError }, { status: 400 });
  }

  order.delivery = {
    inbox: "saved",
    email: "not-configured",
  };
  await upsertOrder(order);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({
      ok: true,
      id: order.id,
      order,
      emailStatus: "not-configured",
      message: "Order saved to the portal inbox.",
    });
  }

  const subject = `BLACKMARKET Wholesale Order - ${order.store.storeName}`;
  const text = orderText(order.store, order.lines, order.totals);
  const html = orderHtml(order.store, order.lines, order.totals);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ORDER_FROM_EMAIL,
        to: [ORDER_TO_EMAIL],
        reply_to: order.store.email,
        subject,
        text,
        html,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      order.delivery.email = "sent";
      order.delivery.emailId = body.id || null;
      await upsertOrder(order);
      return Response.json({ ok: true, id: order.id, order, emailStatus: "sent" });
    }

    order.delivery.email = "failed";
    order.delivery.emailError = body.message || "Email provider rejected the order.";
    await upsertOrder(order);
    return Response.json({
      ok: true,
      id: order.id,
      order,
      emailStatus: "failed",
      message: "Order saved to the portal inbox, but email delivery failed.",
    });
  } catch (error) {
    order.delivery.email = "failed";
    order.delivery.emailError = error?.message || "Email delivery failed.";
    await upsertOrder(order);
    return Response.json({
      ok: true,
      id: order.id,
      order,
      emailStatus: "failed",
      message: "Order saved to the portal inbox, but email delivery failed.",
    });
  }
}

export function GET() {
  return Response.json(
    { ok: false, message: "Method not allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function orderText(store, lines, totals = {}) {
  return [
    "BLACKMARKET Wholesale Order",
    "",
    "Store Information",
    `Store: ${store.storeName}`,
    `Contact: ${store.contactName || ""}`,
    `Phone: ${store.phone}`,
    `Email: ${store.email}`,
    `Address: ${store.street}, ${store.city}, ${store.state} ${store.zip}`,
    store.notes ? `Notes: ${store.notes}` : "",
    "",
    "Items",
    ...lines.map((line) => `${line.qty} x ${line.product} ${line.flavor} / #${line.item} / ${line.wholesale} = ${money(line.lineWholesale)}`),
    "",
    `Units: ${totals.units || 0}`,
    `Wholesale total: ${money(totals.wholesale)}`,
    `Projected MAP value: ${money(totals.map)}`,
  ].filter((line) => line !== "").join("\n");
}

function orderHtml(store, lines, totals = {}) {
  const rows = lines.map((line) => `
    <tr>
      <td>${escapeHtml(line.item)}</td>
      <td>${escapeHtml(line.product)}</td>
      <td>${escapeHtml(line.flavor)}</td>
      <td>${escapeHtml(String(line.qty))}</td>
      <td>${escapeHtml(line.wholesale)}</td>
      <td>${money(line.lineWholesale)}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111">
      <h1>BLACKMARKET Wholesale Order</h1>
      <h2>Store Information</h2>
      <p>
        <strong>${escapeHtml(store.storeName)}</strong><br>
        ${escapeHtml(store.contactName || "")}<br>
        ${escapeHtml(store.phone)} / ${escapeHtml(store.email)}<br>
        ${escapeHtml(store.street)}, ${escapeHtml(store.city)}, ${escapeHtml(store.state)} ${escapeHtml(store.zip)}
      </p>
      ${store.notes ? `<p><strong>Notes:</strong> ${escapeHtml(store.notes)}</p>` : ""}
      <h2>Items</h2>
      <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse">
        <thead>
          <tr>
            <th align="left">Item</th>
            <th align="left">Product</th>
            <th align="left">Flavor</th>
            <th align="left">Qty</th>
            <th align="left">Wholesale</th>
            <th align="left">Line Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <h2>Total: ${money(totals.wholesale)} / ${totals.units || 0} units</h2>
      <p>Projected MAP value: ${money(totals.map)}</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
