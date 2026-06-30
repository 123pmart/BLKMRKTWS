import { normalizeOrderPayload, orderStorageMode, upsertOrder, validateOrder } from "../orders/store.js";

const ORDER_TO_EMAIL = process.env.ORDER_TO_EMAIL || "pmart@blackmarketlabs.com";
const ORDER_FROM_EMAIL = process.env.ORDER_FROM_EMAIL || "pmart@blackmarketlabs.com";

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
  order.delivery.storage = orderStorageMode();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await upsertOrder(order);
    return Response.json({
      ok: true,
      id: order.id,
      order,
      emailStatus: "not-configured",
      storage: order.delivery.storage,
      message: "Order request received.",
    });
  }

  const adminSubject = `New BLACKMARKET Wholesale Order - ${order.store.storeName}`;
  const customerSubject = `BLACKMARKET Wholesale Order Confirmation - ${order.store.storeName}`;

  try {
    const [adminEmail, customerEmail] = await Promise.allSettled([
      sendEmail(apiKey, {
        to: [ORDER_TO_EMAIL],
        replyTo: order.store.email,
        subject: adminSubject,
        text: orderText(order, "New wholesale order"),
        html: orderHtml(order, {
          title: "New Wholesale Order",
          eyebrow: "Admin copy",
          intro: "A new wholesale order was submitted through the BLACKMARKET portal.",
        }),
      }),
      sendEmail(apiKey, {
        to: [order.store.email],
        replyTo: ORDER_TO_EMAIL,
        subject: customerSubject,
        text: orderText(order, "Order confirmation"),
        html: orderHtml(order, {
          title: "Order Confirmation",
          eyebrow: "Buyer copy",
          intro: "Your order has been received by BLACKMARKET Wholesale. Review the unit count, flavors, and pricing below.",
        }),
      }),
    ]);

    if (adminEmail.status === "fulfilled" && customerEmail.status === "fulfilled") {
      order.delivery.email = "sent";
      order.delivery.adminEmailId = adminEmail.value.id || null;
      order.delivery.customerEmailId = customerEmail.value.id || null;
      await upsertOrder(order);
      return Response.json({ ok: true, id: order.id, order, emailStatus: "sent", storage: order.delivery.storage, message: "Order request received." });
    }

    order.delivery.email = "failed";
    order.delivery.emailError = [
      adminEmail.status === "rejected" ? `Admin: ${adminEmail.reason?.message || "failed"}` : "",
      customerEmail.status === "rejected" ? `Customer: ${customerEmail.reason?.message || "failed"}` : "",
    ].filter(Boolean).join(" / ");
    await upsertOrder(order);
    return Response.json({
      ok: true,
      id: order.id,
      order,
      emailStatus: "failed",
      storage: order.delivery.storage,
      message: "Order request received.",
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
      storage: order.delivery.storage,
      message: "Order request received.",
    });
  }
}

async function sendEmail(apiKey, { to, replyTo, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ORDER_FROM_EMAIL,
      to,
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "Email provider rejected the order.");
  }

  return body;
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

function orderText(order, title) {
  const { store, lines, totals = {} } = order;
  return [
    `BLACKMARKET Wholesale ${title}`,
    `Order ID: ${order.id}`,
    `Date: ${new Date(order.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
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
    ...lines.map((line) => `${line.qty} x ${line.product} / ${line.flavor} / #${line.item} / ${line.wholesale} each = ${money(line.lineWholesale)}`),
    "",
    `Units: ${totals.units || 0}`,
    `Wholesale total: ${money(totals.wholesale)}`,
    `Projected MAP value: ${money(totals.map)}`,
  ].filter((line) => line !== "").join("\n");
}

function orderHtml(order, { title, eyebrow, intro }) {
  const { store, lines, totals = {} } = order;
  const rows = lines.map((line) => `
    <tr>
      <td style="padding:14px 12px;border-bottom:1px solid #e8e8e8;color:#111;font-weight:700;">${escapeHtml(String(line.qty))}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e8e8e8;color:#111;">
        <strong style="display:block;font-size:14px;">${escapeHtml(line.product)}</strong>
        <span style="display:block;margin-top:3px;color:#666;font-size:12px;">${escapeHtml(line.flavor)} / Item #${escapeHtml(line.item || "")}${line.upc ? ` / UPC ${escapeHtml(line.upc)}` : ""}</span>
      </td>
      <td style="padding:14px 12px;border-bottom:1px solid #e8e8e8;color:#111;text-align:right;">${escapeHtml(line.wholesale)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e8e8e8;color:#111;text-align:right;font-weight:700;">${money(line.lineWholesale)}</td>
    </tr>
  `).join("");

  return `
    <div style="margin:0;padding:0;background:#f4f4f5;color:#111;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:720px;margin:0 auto;padding:28px 14px;">
        <div style="overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #e5e5e7;box-shadow:0 24px 70px rgba(0,0,0,0.12);">
          <div style="padding:26px 28px;background:#050506;color:#fff;">
            <div style="color:#f6a700;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>
            <h1 style="margin:8px 0 8px;font-size:30px;line-height:1;letter-spacing:-.02em;">${escapeHtml(title)}</h1>
            <p style="margin:0;color:#c8c8ce;font-size:14px;line-height:1.5;">${escapeHtml(intro)}</p>
          </div>
          <div style="padding:22px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:18px;border-collapse:collapse;">
              <tr>
                <td style="padding:12px;border-radius:16px;background:#f7f7f8;">
                  <span style="display:block;color:#777;font-size:11px;font-weight:800;text-transform:uppercase;">Store</span>
                  <strong style="display:block;margin-top:4px;font-size:15px;">${escapeHtml(store.storeName)}</strong>
                  <span style="display:block;margin-top:4px;color:#555;font-size:13px;line-height:1.45;">${escapeHtml(store.contactName || "")}<br>${escapeHtml(store.phone)} / ${escapeHtml(store.email)}<br>${escapeHtml(store.street)}, ${escapeHtml(store.city)}, ${escapeHtml(store.state)} ${escapeHtml(store.zip)}</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;border-collapse:collapse;">
              <tr>
                <td style="padding:14px;border-radius:16px;background:#111;color:#fff;">
                  <span style="display:block;color:#b8b8be;font-size:11px;font-weight:800;text-transform:uppercase;">Order ID</span>
                  <strong style="display:block;margin-top:4px;font-size:13px;">${escapeHtml(order.id)}</strong>
                </td>
                <td width="10"></td>
                <td style="padding:14px;border-radius:16px;background:#111;color:#fff;">
                  <span style="display:block;color:#b8b8be;font-size:11px;font-weight:800;text-transform:uppercase;">Units</span>
                  <strong style="display:block;margin-top:4px;font-size:22px;">${escapeHtml(String(totals.units || 0))}</strong>
                </td>
                <td width="10"></td>
                <td style="padding:14px;border-radius:16px;background:#f6a700;color:#060606;">
                  <span style="display:block;font-size:11px;font-weight:900;text-transform:uppercase;">Wholesale Total</span>
                  <strong style="display:block;margin-top:4px;font-size:22px;">${money(totals.wholesale)}</strong>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e8e8e8;border-radius:16px;overflow:hidden;">
              <thead>
                <tr style="background:#fafafa;">
                  <th align="left" style="padding:11px 12px;color:#777;font-size:11px;text-transform:uppercase;">Units</th>
                  <th align="left" style="padding:11px 12px;color:#777;font-size:11px;text-transform:uppercase;">Flavor / Product</th>
                  <th align="right" style="padding:11px 12px;color:#777;font-size:11px;text-transform:uppercase;">Each</th>
                  <th align="right" style="padding:11px 12px;color:#777;font-size:11px;text-transform:uppercase;">Line</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="display:flex;justify-content:space-between;gap:14px;margin-top:18px;padding-top:18px;border-top:1px solid #ececef;">
              <span style="color:#666;font-size:13px;">Projected MAP value</span>
              <strong style="font-size:18px;">${money(totals.map)}</strong>
            </div>
            ${store.notes ? `<p style="margin:18px 0 0;padding:13px 14px;border-radius:14px;background:#fff8e6;color:#453001;font-size:13px;line-height:1.45;"><strong>Notes:</strong> ${escapeHtml(store.notes)}</p>` : ""}
          </div>
        </div>
      </div>
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
