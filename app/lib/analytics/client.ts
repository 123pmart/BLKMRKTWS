"use client";

export type PortalEventName = "category_viewed" | "search_used" | "first_quantity_added" | "cart_opened" | "checkout_continued" | "order_submitted" | "order_failed";

/** Provider-neutral, no-PII event boundary for a future RUM adapter. */
export function trackPortalEvent(name: PortalEventName, detail: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("blackmarket:analytics", { detail: { name, ...detail } }));
}
