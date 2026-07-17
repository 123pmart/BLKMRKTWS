import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { LogoutButton } from "@/components/account/logout-button";
import { RecentOrders, RecentOrdersFallback } from "@/components/account/recent-orders";
import { PortalHomeLink } from "@/components/navigation/portal-home-link";
import { buttonVariants } from "@/components/ui/button";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { cn } from "@/lib/utils";

export default async function AccountPage() {
  const verified = await getVerifiedStoreAccount();
  if (!verified) redirect("/sign-in?next=/account");
  const { account, identity } = verified;
  const activeOverrides = account.priceOverrides.length;

  return (
    <main className="account-shell">
      <AccountPageHeader />
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
            <Suspense fallback={<RecentOrdersFallback />}>
              <RecentOrders identity={identity} />
            </Suspense>
          </section>
          <section className="account-glass p-6">
            <p className="account-kicker">Account pricing</p>
            <strong className="mt-3 block text-2xl">{activeOverrides ? `${activeOverrides} active override${activeOverrides === 1 ? "" : "s"}` : "Standard wholesale"}</strong>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Approved prices are applied automatically in the catalog, cart, and order verification.</p>
            <PortalHomeLink className={cn(buttonVariants(), "mt-5")}>Shop catalog</PortalHomeLink>
          </section>
        </div>
      </div>
    </main>
  );
}
