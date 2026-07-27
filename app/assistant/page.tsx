import type { Metadata } from "next";

import { ProductAssistant } from "@/components/assistant/product-assistant";
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
      <ProductAssistant
        products={products}
        maintenanceMode={maintenanceMode}
      />
    </main>
  );
}
