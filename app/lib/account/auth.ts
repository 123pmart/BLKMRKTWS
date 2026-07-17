import "server-only";

import type { StoreIdentity } from "@/types";

/**
 * Customer authentication is intentionally closed until a provider and durable
 * store-to-account mapping are configured. Never derive this identity from a
 * query string, local storage, request body, or buyer-entered email address.
 */
export async function getVerifiedStoreIdentity(): Promise<StoreIdentity | null> {
  return null;
}
