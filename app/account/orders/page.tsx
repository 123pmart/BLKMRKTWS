import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { getOrdersForVerifiedStore } from "@/lib/orders/store-order-history";

export default async function AccountOrdersPage() {
  const identity = await getVerifiedStoreIdentity();

  if (!identity) redirect("/sign-in?next=/account/orders");

  const orders = await getOrdersForVerifiedStore(identity);
  return (
    <main className="account-shell">
      <AccountPageHeader />
      <div className="mx-auto w-full max-w-4xl">
        <p className="account-kicker">Store account</p>
        <h1 className="mt-2 mb-6 text-3xl font-black tracking-tight">Order history</h1>
        {orders.length === 0 ? (
          <div className="account-glass p-6"><p className="account-empty">No orders yet.</p></div>
        ) : (
          <div className="account-glass account-orders-table">
            {orders.map((order) => (
              <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.id)}`} className="account-order-row" prefetch>
                <span><strong>{order.id}</strong><small>{new Date(order.date).toLocaleString()}</small></span>
                <span>{order.lines.reduce((sum, line) => sum + line.qty, 0)} items</span>
                <span className="account-order-preview">{order.lines.slice(0, 2).map((line) => `${line.product} ${line.flavor}`).join(", ")}</span>
                <span>{formatMoney(order.totals.grandTotal ?? order.totals.wholesale)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}
