import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { AuthPanel } from "@/components/account/auth-panel";
import { Card, CardContent } from "@/components/ui/card";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { isPortalMaintenanceMode } from "@/lib/maintenance/server";

export default async function SignInPage() {
  if (await isPortalMaintenanceMode()) redirect("/products");
  if (await getVerifiedStoreIdentity()) redirect("/account");
  return (
    <main className="account-shell">
      <AccountPageHeader backLabel="Back to Products" showAccount={false} forceHome />
      <div className="mx-auto grid min-h-[62dvh] w-full max-w-md place-items-center">
        <Card className="account-glass account-auth-card w-full">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">BLACKMARKET Wholesale</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Store Account</h1>
            <p className="mt-2 mb-6 text-sm text-muted-foreground">Sign in or create your store account.</p>
            <AuthPanel />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
