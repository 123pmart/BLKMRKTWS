import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/account/auth-panel";
import { PortalHomeLink } from "@/components/navigation/portal-home-link";
import { Card, CardContent } from "@/components/ui/card";
import { getVerifiedStoreIdentity } from "@/lib/account/auth";
import { isPortalMaintenanceMode } from "@/lib/maintenance/server";

export default async function SignInPage() {
  if (await isPortalMaintenanceMode()) redirect("/products");
  if (await getVerifiedStoreIdentity()) redirect("/account");
  return (
    <main className="account-shell">
      <div className="account-auth-wrap">
        <Card className="account-glass account-auth-card w-full">
          <CardContent className="account-auth-content">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">BLACKMARKET Wholesale</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Store Account</h1>
            <p className="account-auth-intro">Faster ordering. Your store’s order history in one place.</p>
            <AuthPanel />
          </CardContent>
        </Card>
        <PortalHomeLink back replace className="account-auth-back">Back to Products</PortalHomeLink>
      </div>
    </main>
  );
}
