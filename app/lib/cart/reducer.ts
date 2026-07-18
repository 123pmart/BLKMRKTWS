import type { CartState } from "@/types";

export const CART_STORAGE_KEY = "blackmarket-wholesale-cart-v5";
export const LEGACY_CART_STORAGE_KEY = "blackmarket-wholesale-cart-v4";
export const MAX_CART_QUANTITY = 999;

export type CartAction =
  | { type: "hydrate"; state: CartState }
  | { type: "set"; variantId: string; quantity: number }
  | { type: "increment"; variantId: string; amount?: number }
  | { type: "decrement"; variantId: string; amount?: number }
  | { type: "remove"; variantId: string }
  | { type: "merge"; quantities: Record<string, number> }
  | { type: "replace"; quantities: Record<string, number> }
  | { type: "prune"; availableVariantIds: string[] }
  | { type: "clear" };

export function emptyCartState(): CartState {
  return { version: 5, quantities: {}, updatedAt: new Date(0).toISOString() };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === "hydrate") return normalizeCartState(action.state);
  if (action.type === "clear") return nextState({});
  if (action.type === "replace") return nextState(normalizeQuantities(action.quantities));
  if (action.type === "merge") {
    const quantities = { ...state.quantities };
    for (const [id, quantity] of Object.entries(action.quantities)) quantities[id] = clamp((quantities[id] || 0) + quantity);
    return nextState(normalizeQuantities(quantities));
  }
  if (action.type === "prune") {
    const available = new Set(action.availableVariantIds);
    return nextState(Object.fromEntries(Object.entries(state.quantities).filter(([id]) => available.has(id))));
  }
  const quantities = { ...state.quantities };
  if (action.type === "remove") delete quantities[action.variantId];
  if (action.type === "set") setQuantity(quantities, action.variantId, action.quantity);
  if (action.type === "increment") setQuantity(quantities, action.variantId, (quantities[action.variantId] || 0) + (action.amount || 1));
  if (action.type === "decrement") setQuantity(quantities, action.variantId, (quantities[action.variantId] || 0) - (action.amount || 1));
  return nextState(quantities);
}

export function migrateStoredCart(raw: unknown): CartState {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    if (record.version === 5 && record.quantities && typeof record.quantities === "object") {
      return normalizeCartState(record as unknown as CartState);
    }
    return nextState(normalizeQuantities(record));
  }
  return emptyCartState();
}

export function cartUnitCount(state: CartState): number {
  return Object.values(state.quantities).reduce((sum, quantity) => sum + quantity, 0);
}

function setQuantity(quantities: Record<string, number>, variantId: string, quantity: number): void {
  const next = clamp(quantity);
  if (next > 0) quantities[variantId] = next;
  else delete quantities[variantId];
}
function clamp(value: number): number { return Math.max(0, Math.min(MAX_CART_QUANTITY, Math.floor(Number(value) || 0))); }
function normalizeQuantities(input: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(Object.entries(input).map(([id, value]) => [id, clamp(Number(value))]).filter(([id, value]) => Boolean(id) && Number(value) > 0));
}
function normalizeCartState(state: CartState): CartState { return { version: 5, quantities: normalizeQuantities(state.quantities), updatedAt: state.updatedAt || new Date().toISOString() }; }
function nextState(quantities: Record<string, number>): CartState { return { version: 5, quantities: normalizeQuantities(quantities), updatedAt: new Date().toISOString() }; }
