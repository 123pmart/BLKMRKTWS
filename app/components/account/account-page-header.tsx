import Link from "next/link";

import { WholesaleWordmark } from "@/components/branding/wholesale-wordmark";
import { PortalHomeLink } from "@/components/navigation/portal-home-link";

export function AccountPageHeader({ backLabel = "Products", showAccount = true, forceHome = false }: { backLabel?: string; showAccount?: boolean; forceHome?: boolean }) {
  return (
    <header className="account-page-header">
      <PortalHomeLink className="account-page-brand" showIcon={false}>
        <WholesaleWordmark compact />
      </PortalHomeLink>
      <nav aria-label="Account navigation">
        <PortalHomeLink back replace={forceHome} className="account-page-home">{backLabel}</PortalHomeLink>
        {showAccount ? <Link href="/account" prefetch className="account-page-account">Account</Link> : null}
      </nav>
    </header>
  );
}
