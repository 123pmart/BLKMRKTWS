import type { Order, StoreIdentity } from "@/types";

export function canAccessStoreOrder(identity: StoreIdentity, order: Pick<Order, "storeId">): boolean {
  return identity.status === "active" && Boolean(order.storeId) && order.storeId === identity.storeId;
}
