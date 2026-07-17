import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/account/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { getAccountById } from "@/lib/account/account-store";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { getOrdersForVerifiedStore } from "@/lib/orders/store-order-history";
import { cn } from "@/lib/utils";

export default async function AccountPage() {
  const identity = await getVerifiedStoreIdentity();
  if (!identity) redirect("/sign-in?next=/account");
  const account = await getAccountById(identity.accountId);
  if (!account) redirect("/sign-in?next=/account");
  const orders = identity.status === "active" ? await getOrdersForVerifiedStore(identity) : [];
  const activeOverrides = account.priceOverrides.length;

  return (
    <main className="account-shell">
      <div className="mx-auto w-full max-w-4xl">
        <header className="account-glass account-dashboard-head">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Store account</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{account.store.storeName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">@{account.username}</p>
          </div>
          <div className="account-dashboard-actions">
            <span className={`account-status account-status--${account.status}`}>{account.status}</span>
            <LogoutButton />
          </div>
        </header>

        {account.status === "pending" ? (
          <div className="account-notice">Your account request is awaiting approval. Order history and account pricing unlock after approval.</div>
        ) : null}

        <div className="account-dashboard-grid">
          <section className="account-glass p-6">
            <p className="account-kicker">Recent orders</p>
            {orders.length ? (
              <div className="account-order-list">
                {orders.slice(0, 4).map((order) => (
                  <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.id)}`}>
                    <span><strong>{order.id}</strong><small>{new Date(order.date).toLocaleDateString()}</small></span>
                    <span>{formatMoney(order.totals.grandTotal ?? order.totals.wholesale)}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="account-empty">{account.status === "active" ? "No linked orders yet." : "Available after approval."}</p>}
            {account.status === "active" ? <Link className={cn(buttonVariants({ variant: "secondary" }), "mt-5")} href="/account/orders">View all orders</Link> : null}
          </section>
          <section className="account-glass p-6">
            <p className="account-kicker">Account pricing</p>
            <strong className="mt-3 block text-2xl">{activeOverrides ? `${activeOverrides} active override${activeOverrides === 1 ? "" : "s"}` : "Standard wholesale"}</strong>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Approved prices are applied automatically in the catalog, cart, and order verification.</p>
            <Link className={cn(buttonVariants(), "mt-5")} href="/products">Shop catalog</Link>
          </section>
        </div>
      </div>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}
