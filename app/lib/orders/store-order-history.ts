import "server-only";

import type { Order, StoreIdentity } from "@/types";

export class AccountProviderUnavailableError extends Error {
  constructor() {
    super("Store account authentication is not configured.");
    this.name = "AccountProviderUnavailableError";
  }
}

/**
 * This boundary deliberately returns no order data until persisted orders have
 * a server-assigned storeId and authentication supplies a verified identity.
 */
export async function getOrdersForVerifiedStore(_identity: StoreIdentity): Promise<Order[]> {
  void _identity;
  throw new AccountProviderUnavailableError();
}

export async function getOrderForVerifiedStore(_identity: StoreIdentity, _orderId: string): Promise<Order | null> {
  void _identity;
  void _orderId;
  throw new AccountProviderUnavailableError();
}
