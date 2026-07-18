"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";

import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, cartReducer, cartUnitCount, emptyCartState, migrateStoredCart, type CartAction } from "@/lib/cart/reducer";
import type { CartState } from "@/types";

interface CartContextValue {
  state: CartState;
  units: number;
  ready: boolean;
  dispatch: React.Dispatch<CartAction>;
  quantity: (variantId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, emptyCartState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: unknown = null;
    try {
      stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem(LEGACY_CART_STORAGE_KEY) || "null");
    } catch { stored = null; }
    queueMicrotask(() => {
      dispatch({ type: "hydrate", state: migrateStoredCart(stored) });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("blackmarket:cart", { detail: state }));
  }, [ready, state]);

  const value = useMemo<CartContextValue>(() => ({
    state,
    ready,
    dispatch,
    units: cartUnitCount(state),
    quantity: (variantId) => state.quantities[variantId] || 0,
  }), [ready, state]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
