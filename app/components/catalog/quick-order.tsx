"use client";

import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { searchCatalogItems } from "@/lib/catalog/search";
import type { FlattenedCatalogItem } from "@/types";

export function QuickOrder({ items }: { items: FlattenedCatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [message, setMessage] = useState("");
  const { dispatch } = useCart();
  const results = useMemo(() => searchCatalogItems(items, query).slice(0, 6), [items, query]);
  const exactMatches = results.filter((item) => item.item.toLowerCase() === query.trim().toLowerCase());
  const exact = results.find((item) => item.variantId === selectedVariantId) || (exactMatches.length === 1 ? exactMatches[0] : exactMatches.length > 1 ? undefined : results[0]);

  function add() {
    if (!query.trim()) return setMessage("Enter a SKU, UPC, product, or flavor.");
    if (exactMatches.length > 1 && !selectedVariantId) return setMessage("That SKU matches multiple products. Choose the correct product below.");
    if (!exact) return setMessage("No matching product was found.");
    if (!exact.orderable) return setMessage(exact.status === "coming-soon" ? "That SKU is coming soon and cannot be ordered yet." : "That SKU is unavailable.");
    dispatch({ type: "increment", variantId: exact.variantId, amount: Math.max(1, Math.min(999, Math.floor(quantity))) });
    setMessage(`${quantity} × ${exact.productTitle} ${exact.flavor} added.`);
    setQuery(""); setSelectedVariantId("");
  }

  return (
    <section className="quick-order" aria-labelledby="quick-order-title">
      <div><p className="portal-kicker">Fast entry</p><h2 id="quick-order-title">Quick order</h2></div>
      <div className="quick-order__controls">
        <label><span>SKU or product</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedVariantId(""); setMessage(""); }} list="quick-order-results" placeholder="Enter SKU, UPC, product, or flavor" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /></label>
        <datalist id="quick-order-results">{results.map((item) => <option key={item.variantId} value={item.item}>{item.productTitle} — {item.flavor}</option>)}</datalist>
        <label className="quick-order__qty"><span>Qty</span><input type="number" min="1" max="999" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <button type="button" onClick={add}>Add</button>
      </div>
      {query && results.length ? <div className="quick-order__matches" aria-label="Quick-order matches">{results.map((item) => <button key={item.variantId} type="button" aria-pressed={selectedVariantId === item.variantId} onClick={() => { setSelectedVariantId(item.variantId); setMessage(""); }}>#{item.item} · {item.productTitle} · {item.flavor}{item.status === "coming-soon" ? " · Coming Soon" : ""}</button>)}</div> : null}
      {message ? <p className="quick-order__message" role="status">{message}</p> : null}
    </section>
  );
}
