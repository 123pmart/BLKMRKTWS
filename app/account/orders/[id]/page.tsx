import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { getOrderForVerifiedStore } from "@/lib/orders/store-order-history";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getVerifiedStoreIdentity();
  if (!identity) redirect("/sign-in?next=/account/orders");

  const { id } = await params;
  const order = await getOrderForVerifiedStore(identity, id);
  if (!order) notFound();

  return (
    <main className="account-shell">
      <article className="account-order-detail mx-auto w-full max-w-4xl">
        <header className="account-glass account-order-head">
          <div><p className="account-kicker">Wholesale order</p><h1>{order.id}</h1><p>{new Date(order.date).toLocaleString()}</p></div>
          <div><span className="account-status account-status--active">{order.status}</span><Link href={`/api/account/orders/${encodeURIComponent(order.id)}/pdf`} className="account-pdf-link">Download PDF</Link></div>
        </header>
        <section className="account-glass account-order-store">
          <strong>{order.store.storeName}</strong>
          <span>{order.store.contactName}</span>
          <span>{order.store.email} · {order.store.phone}</span>
          <span>{order.store.street}, {order.store.city}, {order.store.state} {order.store.zip}</span>
        </section>
        <section className="account-glass account-order-lines">
          {order.lines.map((line, index) => (
            <div className="account-order-line" key={`${line.variantId || line.item}-${index}`}>
              <div className="account-order-thumb">
                {line.image ? <Image src={line.image} alt="" width={64} height={64} unoptimized /> : <span>BM</span>}
              </div>
              <div><strong>{line.product}</strong><span>{line.flavor}</span><small>SKU {line.item}</small></div>
              <span>{line.qty} × {formatMoney(Number(line.wholesale.replace(/[^0-9.]/g, "")))}</span>
              <strong>{formatMoney(line.lineWholesale)}</strong>
            </div>
          ))}
        </section>
        <section className="account-glass account-order-totals">
          <span>Subtotal <strong>{formatMoney(order.totals.subtotal ?? order.totals.wholesale)}</strong></span>
          {order.totals.discount ? <span>Account savings <strong>-{formatMoney(order.totals.discount)}</strong></span> : null}
          {order.totals.shipping ? <span>Shipping <strong>{formatMoney(order.totals.shipping)}</strong></span> : null}
          {order.totals.tax ? <span>Tax <strong>{formatMoney(order.totals.tax)}</strong></span> : null}
          <span className="account-order-grand">Total <strong>{formatMoney(order.totals.grandTotal ?? order.totals.wholesale)}</strong></span>
        </section>
      </article>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}
