import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductAssistant } from "@/components/assistant/product-assistant";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getAssistantAvailability } from "@/lib/assistant/availability";
import { loadAssistantProducts } from "@/lib/assistant/catalog";

export const metadata: Metadata = {
  title: "Product Assistant | BLACKMARKET Wholesale",
  description: "Verified BLACKMARKET product knowledge for wholesale buyers.",
};

export default async function AssistantPage() {
  const [verified, adminIdentity, availability] = await Promise.all([
    getVerifiedStoreAccount(),
    getAdminIdentity(),
    getAssistantAvailability(),
  ]);
  if (!availability.enabled && !adminIdentity) redirect("/");
  const products = await loadAssistantProducts(verified?.account.priceOverrides ?? []);

  return (
    <main className="assistant-shell">
      <ProductAssistant
        products={products}
        maintenanceMode={availability.maintenanceMode}
        adminPreview={!availability.enabled && Boolean(adminIdentity)}
      />
    </main>
  );
}
