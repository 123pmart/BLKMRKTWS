import "server-only";

import webpush from "web-push";
import type { SalespersonId } from "@/types";
import { claimPushEvent, deactivatePushSubscription, listActivePushSubscriptions } from "./store";
import type { PushAudience, PushMessage, StoredPushSubscription } from "./types";

interface SendPushOptions {
  eventId: string;
  audience: PushAudience;
  salesperson?: SalespersonId;
  message: PushMessage;
}

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  subscribers: number;
  skipped: boolean;
  reason?: "not-configured" | "duplicate-event";
}

export function webPushConfigured(): boolean {
  return Boolean(
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY &&
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY &&
    process.env.WEB_PUSH_CONTACT,
  );
}

export function webPushPublicKey(): string {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "";
}

export async function sendPushNotification(options: SendPushOptions): Promise<PushDeliveryResult> {
  if (!webPushConfigured()) {
    console.warn("Web Push is not configured; notification was not dispatched.");
    return { sent: 0, failed: 0, subscribers: 0, skipped: true, reason: "not-configured" };
  }

  const claimed = await claimPushEvent(options.eventId);
  if (!claimed) {
    return { sent: 0, failed: 0, subscribers: 0, skipped: true, reason: "duplicate-event" };
  }

  const records = (await listActivePushSubscriptions()).filter((record) => matchesAudience(record, options));
  const payload = JSON.stringify(options.message);
  const vapidDetails = {
    subject: process.env.WEB_PUSH_CONTACT as string,
    publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY as string,
    privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY as string,
  };

  let sent = 0;
  let failed = 0;
  await Promise.all(records.map(async (record) => {
    try {
      await webpush.sendNotification(record.subscription, payload, {
        TTL: 86_400,
        urgency: "high",
        timeout: 5_000,
        vapidDetails,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = Number((error as { statusCode?: number }).statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        await deactivatePushSubscription(record.subscription.endpoint).catch(() => undefined);
      } else {
        console.error("Web Push delivery failed:", error);
      }
    }
  }));

  return { sent, failed, subscribers: records.length, skipped: false };
}

function matchesAudience(record: StoredPushSubscription, options: SendPushOptions): boolean {
  if (record.audience !== options.audience) return false;
  if (options.audience === "customer") return true;
  if (!record.adminIdentity || !options.salesperson) return false;
  return record.adminIdentity.scope === "all" || record.adminIdentity.salesperson === options.salesperson;
}
