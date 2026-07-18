"use client";

import { useCart } from "@/components/cart/cart-provider";
import { trackPortalEvent } from "@/lib/analytics/client";

export function QuantityControl({ variantId, label, disabled = false }: { variantId: string; label: string; disabled?: boolean }) {
  const { quantity, dispatch } = useCart();
  const value = quantity(variantId);
  function addOne() {
    if (!sessionStorage.getItem("blackmarket-first-quantity")) {
      sessionStorage.setItem("blackmarket-first-quantity", "1");
      trackPortalEvent("first_quantity_added", { variantId });
    }
    dispatch({ type: "increment", variantId });
  }
  return (
    <div className="quantity-control" aria-label={`Quantity for ${label}`}>
      <button type="button" disabled={disabled || value === 0} onClick={() => dispatch({ type: "decrement", variantId })} aria-label={`Decrease ${label} quantity`}>−</button>
      <input
        type="number"
        min="0"
        max="999"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => dispatch({ type: "set", variantId, quantity: Number(event.target.value) })}
        aria-label={`${label} quantity`}
      />
      <button type="button" disabled={disabled} onClick={addOne} aria-label={`Increase ${label} quantity`}>+</button>
    </div>
  );
}
