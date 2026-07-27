import type { Metadata } from "next";
import Link from "next/link";

import { ProductAssistant } from "@/components/assistant/product-assistant";
import { WholesaleWordmark } from "@/components/branding/wholesale-wordmark";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { loadAssistantProducts } from "@/lib/assistant/catalog";
import { isPortalMaintenanceMode } from "@/lib/maintenance/server";

export const metadata: Metadata = {
  title: "Product Assistant | BLACKMARKET Wholesale",
  description: "Verified BLACKMARKET product knowledge for wholesale buyers.",
};

export default async function AssistantPage() {
  const [verified, maintenanceMode] = await Promise.all([
    getVerifiedStoreAccount(),
    isPortalMaintenanceMode(),
  ]);
  const products = await loadAssistantProducts(verified?.account.priceOverrides ?? []);

  return (
    <main className="assistant-shell">
      <header className="assistant-page-header">
        <Link href="/" className="assistant-page-brand" aria-label="BLACKMARKET Wholesale home">
          <WholesaleWordmark compact />
        </Link>
        <nav aria-label="Assistant navigation">
          <Link href="/products">Products</Link>
          <Link href={verified ? "/account" : "/sign-in?next=/assistant"}>
            {verified ? "Account" : "Sign in"}
          </Link>
        </nav>
      </header>
      <ProductAssistant
        products={products}
        accountName={verified?.account.store.storeName}
        maintenanceMode={maintenanceMode}
      />
    </main>
  );
}
