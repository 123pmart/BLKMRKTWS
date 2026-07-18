"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { QuantityControl } from "@/components/catalog/quantity-control";
import { Button } from "@/components/ui/button";
import type { CatalogContract, Order, StoreProfile } from "@/types";
import { trackPortalEvent } from "@/lib/analytics/client";

const GUEST_DETAILS_KEY = "blackmarket-wholesale-store-v3";

export function CheckoutCart({ contract, profile }: { contract: CatalogContract; profile: StoreProfile | null }) {
  const { state, dispatch, ready } = useCart();
  const [step, setStep] = useState<"items" | "details">("items");
  const [guestProfile, setGuestProfile] = useState<Partial<StoreProfile>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const lines = useMemo(() => contract.items.filter((item) => state.quantities[item.variantId] > 0 && item.orderable).map((item) => ({ item, quantity: state.quantities[item.variantId] })), [contract.items, state.quantities]);
  const total = lines.reduce((sum, line) => sum + Number(line.item.wholesaleValue || 0) * line.quantity, 0);
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    if (profile) return;
    let stored: Partial<StoreProfile> = {};
    try { stored = JSON.parse(localStorage.getItem(GUEST_DETAILS_KEY) || "{}"); } catch { stored = {}; }
    queueMicrotask(() => setGuestProfile(stored));
  }, [profile]);

  useEffect(() => {
    if (!ready) return;
    dispatch({ type: "prune", availableVariantIds: contract.items.filter((item) => item.orderable).map((item) => item.variantId) });
  }, [contract.items, dispatch, ready]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) return;
    setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const store = Object.fromEntries(form.entries());
    delete store.saveProfile;
    if (!profile) localStorage.setItem(GUEST_DETAILS_KEY, JSON.stringify(store));
    const payload = { store, lines: lines.map(({ item, quantity }) => ({ variantId: item.variantId, item: item.item, qty: quantity })) };
    try {
      const preview = await fetch("/api/order-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const previewResult = await preview.json();
      if (!preview.ok || !previewResult.ok) throw new Error(previewResult.message || "Order review failed.");
      if (profile && form.get("saveProfile") === "on") {
        const saved = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Blackmarket-Request": "portal" },
          body: JSON.stringify(store),
        });
        if (!saved.ok) throw new Error("Your order is ready, but the profile update failed. Review the details and try again.");
      }
      const response = await fetch("/api/send-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Order submission failed.");
      setSubmittedOrder(result.order);
      dispatch({ type: "clear" });
      setMessage("Order submitted successfully.");
      trackPortalEvent("order_submitted", { units });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Order submission failed."); trackPortalEvent("order_failed", { units }); }
    finally { setPending(false); }
  }

  async function downloadOrder() {
    if (!submittedOrder) return;
    const response = await fetch("/api/order-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submittedOrder) });
    if (!response.ok) return setMessage("The PDF could not be generated.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = `blackmarket-order-${submittedOrder.id}.pdf`; link.click(); URL.revokeObjectURL(url);
  }

  if (submittedOrder) return (
    <section className="checkout-confirmation" aria-live="polite"><p className="portal-kicker">Order received</p><h1>Thank you.</h1><p>Order <strong>{submittedOrder.id}</strong> is in the wholesale inbox.</p><div><Button type="button" onClick={downloadOrder}>Download order PDF</Button><Link href="/products">Continue shopping</Link></div>{message ? <p role="status">{message}</p> : null}</section>
  );

  return (
    <form className="checkout" onSubmit={submit}>
      <header className="checkout__header"><div><p className="portal-kicker">Wholesale order</p><h1>Your cart</h1></div><div className="checkout__steps" aria-label="Checkout progress"><button type="button" aria-current={step === "items" ? "step" : undefined} onClick={() => setStep("items")}>1 Items</button><button type="button" aria-current={step === "details" ? "step" : undefined} disabled={!lines.length} onClick={() => setStep("details")}>2 Details</button></div></header>
      {step === "items" ? (
        <section className="checkout__items" aria-label="Cart items">
          {!ready ? <p>Loading cart…</p> : !lines.length ? <div className="portal-empty"><h2>Your cart is empty.</h2><Link href="/products">Browse products</Link></div> : lines.map(({ item, quantity }) => <article key={item.variantId} className="cart-line"><img src={item.cardImage || item.bottle} alt="" width="96" height="96" loading="lazy" decoding="async" /><div><strong>{item.productTitle}</strong><span>{item.flavor} · #{item.item}</span><span>{item.wholesale} each</span></div><QuantityControl variantId={item.variantId} label={`${item.productTitle} ${item.flavor}`} /><b>{formatMoney(Number(item.wholesaleValue || 0) * quantity)}</b><button type="button" onClick={() => dispatch({ type: "remove", variantId: item.variantId })} aria-label={`Remove ${item.productTitle} ${item.flavor}`}>Remove</button></article>)}
        </section>
      ) : <CheckoutFields initial={profile || guestProfile} authenticated={Boolean(profile)} />}
      <footer className="checkout__footer"><div><span>{units} unit{units === 1 ? "" : "s"}</span><strong>{formatMoney(total)}</strong></div>{step === "items" ? <Button type="button" disabled={!lines.length} onClick={() => { setStep("details"); trackPortalEvent("checkout_continued", { units }); }}>Continue to details</Button> : <><Button type="button" variant="secondary" onClick={() => setStep("items")}>Back</Button><Button type="submit" disabled={pending || !lines.length}>{pending ? "Submitting…" : "Submit Order"}</Button></>}{message ? <p role="alert">{message}</p> : null}</footer>
    </form>
  );
}

function CheckoutFields({ initial, authenticated }: { initial: Partial<StoreProfile>; authenticated: boolean }) {
  return <section className="checkout-fields" aria-labelledby="buyer-details-title"><div><p className="portal-kicker">Buyer & shipping</p><h2 id="buyer-details-title">Order details</h2><p>{authenticated ? "Verified account details are prefilled. Edits apply to this order unless you choose to save them." : "Guest details stay on this device for your next order."}</p></div><div className="checkout-fields__grid">{FIELDS.map((field) => <label key={field.name}><span>{field.label}</span><input name={field.name} type={field.type || "text"} autoComplete={field.autoComplete} defaultValue={String(initial[field.name] || "")} required /></label>)}{!authenticated ? <label><span>Salesperson</span><select name="salesperson" required defaultValue=""><option value="" disabled>Select salesperson</option><option value="parker">Parker</option><option value="matt">Matt</option><option value="beau">Beau</option></select></label> : null}<label className="checkout-fields__notes"><span>Notes</span><textarea name="notes" rows={3} /></label></div>{authenticated ? <label className="checkout-fields__save"><input type="checkbox" name="saveProfile" /> Save these details to my account</label> : null}</section>;
}

const FIELDS: Array<{ name: keyof StoreProfile; label: string; autoComplete: string; type?: string }> = [
  { name: "storeName", label: "Store name", autoComplete: "organization" }, { name: "contactName", label: "Contact name", autoComplete: "name" }, { name: "phone", label: "Phone", autoComplete: "tel", type: "tel" }, { name: "email", label: "Email", autoComplete: "email", type: "email" }, { name: "street", label: "Street address", autoComplete: "shipping street-address" }, { name: "city", label: "City", autoComplete: "shipping address-level2" }, { name: "state", label: "State", autoComplete: "shipping address-level1" }, { name: "zip", label: "ZIP", autoComplete: "shipping postal-code" },
];
function formatMoney(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
