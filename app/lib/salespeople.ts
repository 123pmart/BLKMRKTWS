import type { AdminIdentity, SalespersonId, StoreAccount } from "@/types";

export const SALESPERSONS: ReadonlyArray<{ id: SalespersonId; label: string }> = [
  { id: "parker", label: "Parker" },
  { id: "matt", label: "Matt" },
  { id: "beau", label: "Beau" },
];

export function isSalespersonId(value: unknown): value is SalespersonId {
  return value === "parker" || value === "matt" || value === "beau";
}

export function normalizeSalesperson(value: unknown, fallback: SalespersonId = "parker"): SalespersonId {
  const normalized = String(value ?? "").trim().toLowerCase();
  return isSalespersonId(normalized) ? normalized : fallback;
}

export function orderSalesperson(order: { salesperson?: unknown; store?: { salesperson?: unknown } }): SalespersonId {
  return normalizeSalesperson(order.salesperson || order.store?.salesperson);
}

export function accountSalesperson(account: Pick<StoreAccount, "store">): SalespersonId {
  return normalizeSalesperson(account.store?.salesperson);
}

export function adminCanAccessSalesperson(identity: AdminIdentity, salesperson: unknown): boolean {
  return identity.scope === "all" || identity.salesperson === normalizeSalesperson(salesperson);
}
