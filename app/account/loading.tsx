import { AccountPageHeader } from "@/components/account/account-page-header";

export default function AccountLoading() {
  return (
    <main className="account-shell">
      <AccountPageHeader />
      <div className="account-route-loading mx-auto w-full max-w-4xl" aria-label="Loading account">
        <span className="account-route-loading__title" />
        <span />
        <span />
      </div>
    </main>
  );
}
