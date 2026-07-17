import { AccountStatusCard } from "@/components/account/account-status-card";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { getOrdersForVerifiedStore } from "@/lib/orders/store-order-history";

export default async function AccountOrdersPage() {
  const identity = await getVerifiedStoreIdentity();

  if (!identity) {
    return (
      <main className="account-shell">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="mb-6 text-3xl font-black tracking-tight">Order history</h1>
          <AccountStatusCard
            title="Sign-in required"
            description="Order history stays unavailable until the server can verify a store identity. Buyer-entered IDs, email addresses, URL values, and local storage are never accepted as authorization."
          />
        </div>
      </main>
    );
  }

  const orders = await getOrdersForVerifiedStore(identity);
  return (
    <main className="account-shell">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-6 text-3xl font-black tracking-tight">Order history</h1>
        {orders.length === 0 ? (
          <AccountStatusCard title="No orders yet" description="Orders placed by this verified store will appear here." />
        ) : null}
      </div>
    </main>
  );
}
