"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { reorderQuantities, type ReorderReview } from "@/lib/orders/reorder";

export function ReorderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<ReorderReview | null>(null);
  const [message, setMessage] = useState("");
  const { state, dispatch } = useCart();
  const router = useRouter();
  async function load() {
    setMessage(""); setOpen(true);
    const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}/reorder`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) return setMessage(result.message || "This order could not be loaded.");
    setReview(result.review);
  }
  function apply(mode: "merge" | "replace") {
    if (!review) return;
    dispatch({ type: mode, quantities: reorderQuantities(review) });
    setOpen(false); router.push("/cart");
  }
  const hasCart = Object.keys(state.quantities).length > 0;
  return <><Button type="button" onClick={load}>Reorder</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="reorder-dialog"><DialogTitle>Review reorder</DialogTitle><DialogDescription>Current availability and account pricing are shown. Nothing is submitted until checkout.</DialogDescription>{message ? <p role="alert">{message}</p> : review ? <><ul>{review.available.map((line) => <li key={line.variantId}><span>{line.quantity} × {line.item.productTitle} · {line.item.flavor}</span><strong>{line.item.wholesale}</strong></li>)}</ul>{review.unavailable.length ? <div className="reorder-unavailable"><strong>Not added</strong>{review.unavailable.map((line, index) => <p key={`${line.label}-${index}`}>{line.quantity} × {line.label} — {line.reason}</p>)}</div> : null}<div className="reorder-dialog__actions">{hasCart ? <Button variant="secondary" type="button" onClick={() => apply("merge")}>Merge with cart</Button> : null}<Button type="button" disabled={!review.available.length} onClick={() => apply("replace")}>{hasCart ? "Replace cart" : "Add to cart"}</Button></div></> : <p>Checking current catalog…</p>}</DialogContent></Dialog></>;
}
