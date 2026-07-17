import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/account/auth-panel";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";

export default async function SignInPage() {
  if (await getVerifiedStoreIdentity()) redirect("/account");
  return (
    <main className="account-shell">
      <div className="mx-auto grid min-h-[70dvh] w-full max-w-md place-items-center">
        <div className="account-glass w-full p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">BLACKMARKET Wholesale</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Store account</h1>
          <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">Sign in to view approved store pricing and order history.</p>
          <AuthPanel />
        </div>
      </div>
    </main>
  );
}
