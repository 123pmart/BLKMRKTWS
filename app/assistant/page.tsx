import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductAssistant } from "@/components/assistant/product-assistant";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getAssistantAvailability } from "@/lib/assistant/availability";

export const metadata: Metadata = {
  title: "Product Assistant | BLACKMARKET Wholesale",
  description: "Verified BLACKMARKET product knowledge for wholesale buyers.",
};

export default async function AssistantPage() {
  const [adminIdentity, availability] = await Promise.all([
    getAdminIdentity(),
    getAssistantAvailability(),
  ]);
  if (!availability.enabled && !adminIdentity) redirect("/");

  return (
    <main className="assistant-shell">
      <ProductAssistant
        maintenanceMode={availability.maintenanceMode}
        adminPreview={!availability.enabled && Boolean(adminIdentity)}
      />
    </main>
  );
}
