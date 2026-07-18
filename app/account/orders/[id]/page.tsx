import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { OrderProductImage } from "@/components/account/order-product-image";
import { WholesaleWordmark } from "@/components/branding/wholesale-wordmark";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { formatOrderLineMargin } from "@/lib/orders/margin";
import { withResolvedOrderImages } from "@/lib/orders/order-images";
import { getOrderForVerifiedStore } from "@/lib/orders/store-order-history";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getVerifiedStoreIdentity();
  if (!identity) redirect("/sign-in?next=/account/orders");

  const { id } = await params;
  const savedOrder = await getOrderForVerifiedStore(identity, id);
  if (!savedOrder) notFound();
  const order = await withResolvedOrderImages(savedOrder);

  return (
    <main className="account-shell">
      <AccountPageHeader />
      <article className="account-order-detail order-document mx-auto w-full max-w-5xl">
        <div className="order-document-toolbar">
          <Link href="/account/orders" className="order-history-back" prefetch>← Order history</Link>
          <Link href={`/api/account/orders/${encodeURIComponent(order.id)}/pdf`} className="account-pdf-link">Download PDF</Link>
        </div>
        <header className="order-document-header">
          <WholesaleWordmark />
          <p>Wholesale order</p>
        </header>
        <section className="order-document-meta" aria-label="Order summary">
          <span><small>Order number</small><strong>{order.id}</strong></span>
          <span><small>Order date</small><strong>{new Date(order.date).toLocaleDateString()}</strong></span>
          <span><small>Status</small><strong>{order.status}</strong></span>
        </section>
        <section className="order-document-section account-order-store" aria-labelledby="store-information-heading">
          <div className="order-document-section-title">
            <h2 id="store-information-heading">Details</h2>
          </div>
          <div className="order-detail-grid">
            <span><small>Store</small><strong>{order.store.storeName}</strong></span>
            <span><small>Contact</small><strong>{order.store.contactName}</strong></span>
            <span><small>Email</small><strong>{order.store.email}</strong></span>
            <span><small>Phone</small><strong>{order.store.phone}</strong></span>
            <span className="order-store-address"><small>Ship to</small><strong>{order.store.street}, {order.store.city}, {order.store.state} {order.store.zip}</strong></span>
          </div>
        </section>
        <section className="order-document-section account-order-lines" aria-labelledby="ordered-products-heading">
          <div className="order-document-section-title">
            <h2 id="ordered-products-heading">Products</h2>
          </div>
          <div className="account-order-line account-order-line--head" aria-hidden="true">
            <span>Item</span><span>Product</span><span>Margin</span><span>Quantity</span><span>Unit price</span><span>Total</span>
          </div>
          {order.lines.map((line, index) => (
            <div className="account-order-line" key={`${line.variantId || line.item}-${index}`}>
              <OrderProductImage src={line.image} alt={`${line.product} ${line.flavor}`} priority={index === 0} />
              <div className="account-order-product"><strong>{line.product}</strong><span>{line.flavor}</span><small>SKU {line.item}</small></div>
              <span data-label="Margin">{formatOrderLineMargin(line)}</span>
              <span data-label="Quantity">{line.qty}</span>
              <span data-label="Unit price">{formatMoney(unitPrice(line.lineWholesale, line.qty))}</span>
              <strong data-label="Line total">{formatMoney(line.lineWholesale)}</strong>
            </div>
          ))}
        </section>
        <section className="order-document-section account-order-totals" aria-label="Order totals">
          <span className="account-order-grand">Total <strong>{formatMoney(order.totals.grandTotal ?? order.totals.wholesale)}</strong></span>
        </section>
      </article>
    </main>
  );
}

function unitPrice(total: number, quantity: number) {
  return quantity > 0 ? total / quantity : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}
