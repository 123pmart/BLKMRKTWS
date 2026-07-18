import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getOrdersForVerifiedStore } from "@/lib/orders/store-order-history";
import { cn } from "@/lib/utils";
import type { StoreIdentity } from "@/types";

export async function RecentOrders({ identity }: { identity: StoreIdentity }) {
  const orders = await getOrdersForVerifiedStore(identity);
  return (
    <>
      {orders.length ? (
        <div className="account-order-list">
          {orders.slice(0, 4).map((order) => (
            <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.id)}`} prefetch>
              <span><strong>{order.id}</strong><small>{new Date(order.date).toLocaleDateString()}</small></span>
              <span>{formatMoney(order.totals.grandTotal ?? order.totals.wholesale)}</span>
            </Link>
          ))}
        </div>
      ) : <p className="account-empty">No orders yet.</p>}
      <Link className={cn(buttonVariants({ variant: "secondary" }), "mt-5")} href="/account/orders" prefetch>View all orders</Link>
    </>
  );
}

export function RecentOrdersFallback() {
  return <div className="account-orders-loading" aria-label="Loading recent orders"><span /><span /><span /></div>;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}
