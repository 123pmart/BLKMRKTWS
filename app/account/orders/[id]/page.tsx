import { notFound } from "next/navigation";

import { AccountStatusCard } from "@/components/account/account-status-card";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { getOrderForVerifiedStore } from "@/lib/orders/store-order-history";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getVerifiedStoreIdentity();
  if (!identity) {
    return (
      <main className="account-shell">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="mb-6 text-3xl font-black tracking-tight">Order detail</h1>
          <AccountStatusCard title="Sign-in required" description="This order cannot be accessed without a verified server-side store identity." />
        </div>
      </main>
    );
  }

  const { id } = await params;
  const order = await getOrderForVerifiedStore(identity, id);
  if (!order) notFound();

  return <main className="account-shell"><pre>{JSON.stringify(order, null, 2)}</pre></main>;
}
