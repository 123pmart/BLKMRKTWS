"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { QuantityControl } from "@/components/catalog/quantity-control";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FlattenedCatalogItem } from "@/types";

export function ProductDetail({ item }: { item: FlattenedCatalogItem }) {
  const [selected, setSelected] = useState(item.gallery[0]?.src || item.bottle || "");
  const label = `${item.productTitle} ${item.flavor}`;
  return (
    <article className="product-detail">
      <section className="product-detail__media" aria-label={`${label} images`}>
        <img className="product-detail__hero-image" src={selected} alt={label} width="720" height="720" decoding="async" fetchPriority="high" />
        <div className="product-detail__thumbs">
          {item.gallery.map((image) => image.kind === "facts" ? (
            <Dialog key={image.src}>
              <DialogTrigger asChild><button type="button" aria-label={`Enlarge ${image.label}`} className="product-detail__thumb"><img src={image.src} alt="" width="88" height="88" loading="lazy" decoding="async" /></button></DialogTrigger>
              <DialogContent className="product-facts-dialog"><DialogTitle>Supplement Facts</DialogTitle><DialogDescription>{label}</DialogDescription><img src={image.src} alt={`Supplement Facts for ${label}`} width="1000" height="1200" /></DialogContent>
            </Dialog>
          ) : (
            <button key={image.src} type="button" aria-pressed={selected === image.src} aria-label={`Show ${image.label}`} className="product-detail__thumb" onClick={() => setSelected(image.src)}><img src={image.src} alt="" width="88" height="88" loading="lazy" decoding="async" /></button>
          ))}
        </div>
      </section>
      <section className="product-detail__copy">
        <p className="portal-kicker">SKU {item.item}{item.upc ? ` · UPC ${item.upc}` : ""}</p>
        <h1>{item.productTitle}</h1>
        <p className="product-detail__flavor">{item.flavor}</p>
        <div className="product-detail__badges">{item.limitedEdition ? <span>Limited Edition</span> : null}{item.runningLow ? <span>Running Low</span> : null}{item.status === "coming-soon" ? <span>Coming Soon</span> : null}</div>
        <p className="product-detail__description">{item.productDescription || item.description}</p>
        <div className="product-detail__pricing"><strong>{item.wholesale}</strong><span>Wholesale</span><b>{item.map}</b><span>MAP</span></div>
        <QuantityControl variantId={item.variantId} label={label} disabled={!item.orderable} />
      </section>
    </article>
  );
}
