import "server-only";

import { readContent } from "@/api/content/store.js";
import type { Announcement } from "@/types";

const FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  { id: "cuts-natural-launch", label: "Launch", title: "CUTS Natural is now available", body: "The natural flavor, color, and sweetener version of the best-selling CUTS thermogenic formula is live for wholesale ordering.", image: "/assets/products/cuts-natural-thermogenic-pre-workout-bottle.png", date: "2026-06-16" },
  { id: "portal-open", label: "Portal", title: "Wholesale ordering portal is open", body: "Build an order, review current pricing, and submit it directly to BLACKMARKET.", image: "/assets/products/rule-hyper-focus-bottle.png", date: "2026-06-16" },
];

export async function loadPublicAnnouncements(): Promise<Announcement[]> {
  const content = await readContent().catch(() => null) as { announcements?: Announcement[] } | null;
  return Array.isArray(content?.announcements) && content.announcements.length ? content.announcements : FALLBACK_ANNOUNCEMENTS;
}
