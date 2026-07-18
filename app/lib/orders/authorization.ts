import type { Order, StoreIdentity } from "@/types";

export function canAccessStoreOrder(identity: StoreIdentity, order: Pick<Order, "storeId">): boolean {
  return identity.status !== "disabled" && Boolean(order.storeId) && order.storeId === identity.storeId;
}
