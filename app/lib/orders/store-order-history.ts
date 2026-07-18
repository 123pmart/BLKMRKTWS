import "server-only";

import { readOrders } from "@/api/orders/store.js";
import { canAccessStoreOrder } from "@/lib/orders/authorization";
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
export async function getOrdersForVerifiedStore(identity: StoreIdentity): Promise<Order[]> {
  if (identity.status === "disabled") return [];
  const orders = await readOrders() as Order[];
  return orders
    .filter((order) => canAccessStoreOrder(identity, order))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getOrderForVerifiedStore(identity: StoreIdentity, orderId: string): Promise<Order | null> {
  if (identity.status === "disabled") return null;
  const orders = await readOrders() as Order[];
  return orders.find((order) => canAccessStoreOrder(identity, order) && order.id === orderId) ?? null;
}
