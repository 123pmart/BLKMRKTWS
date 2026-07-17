import { AccountStatusCard } from "@/components/account/account-status-card";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";

export default async function AccountPage() {
  const identity = await getVerifiedStoreIdentity();

  return (
    <main className="account-shell">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-3xl font-black tracking-tight">Store account</h1>
        <AccountStatusCard
          title={identity ? "Account connected" : "Secure sign-in is not yet available"}
          description={identity
            ? "Your verified store identity is ready for account features."
            : "The account pages and server authorization boundary are in place, but no customer identity provider or durable store ownership model exists yet. No order data is exposed."}
          showOrdersLink={Boolean(identity)}
        />
      </div>
    </main>
  );
}
