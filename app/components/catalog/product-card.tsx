import Link from "next/link";

import { QuantityControl } from "@/components/catalog/quantity-control";
import type { FlattenedCatalogItem } from "@/types";

export function ProductCard({ item, priority = false }: { item: FlattenedCatalogItem; priority?: boolean }) {
  const label = `${item.productTitle} ${item.flavor}`;
  return (
    <article className={`product-card${item.status === "coming-soon" ? " product-card--coming" : ""}`} data-variant-id={item.variantId}>
      <div className="product-card__meta"><span>#{item.item}</span><span>{item.flavor}</span></div>
      <Link className="product-card__details" href={`/products/${encodeURIComponent(item.variantId)}`} aria-label={`View details for ${label}`}>
        {/* Catalog and Blob image sources are resolved server-side. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.cardImage || item.bottle} alt={label} width="320" height="320" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
        <h3>{item.productTitle}</h3>
        <span className="product-card__flavor">{item.flavor}</span>
      </Link>
      <div className="product-card__badges">
        {item.limitedEdition ? <span>Limited Edition</span> : null}
        {item.runningLow ? <span>Running Low</span> : null}
        {item.status === "coming-soon" ? <span>Coming Soon</span> : null}
      </div>
      <div className="product-card__price"><strong>{item.wholesale}</strong><span>MAP {item.map}</span></div>
      <QuantityControl variantId={item.variantId} label={label} disabled={!item.orderable} />
    </article>
  );
}
