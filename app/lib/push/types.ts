import type { AdminIdentity } from "@/types";

export type PushAudience = "customer" | "admin";

export interface BrowserPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface StoredPushSubscription {
  endpointHash: string;
  subscription: BrowserPushSubscription;
  audience: PushAudience;
  adminIdentity?: AdminIdentity;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url: "/news" | "/admin";
  tag: string;
}
