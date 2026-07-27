import "server-only";

import { readContent } from "@/api/content/store.js";

export interface AssistantAvailability {
  enabled: boolean;
  maintenanceMode: boolean;
}

/**
 * Customer access fails closed. Admin previews are authorized separately by
 * the assistant route and do not change this shared release state.
 */
export async function getAssistantAvailability(): Promise<AssistantAvailability> {
  const content = await readContent().catch((error: unknown) => {
    console.error("Unable to verify product assistant availability:", error);
    return null;
  });
  return {
    enabled: content?.assistantEnabled === true,
    maintenanceMode: content?.maintenanceMode !== false,
  };
}
