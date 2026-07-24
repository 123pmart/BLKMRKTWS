import { readContent } from "@/api/content/store.js";

/**
 * Maintenance fails closed so stale clients cannot create new customer
 * sessions or orders when the shared content store is unavailable.
 */
export async function isPortalMaintenanceMode(): Promise<boolean> {
  const content = await readContent().catch((error: unknown) => {
    console.error("Unable to verify portal maintenance status:", error);
    return null;
  });
  return content?.maintenanceMode !== false;
}
