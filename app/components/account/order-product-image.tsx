"use client";

import { useState } from "react";

export function OrderProductImage({ src, alt, priority = false }: { src?: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(!src);
  return (
    <span className="order-product-image">
      {!failed && src ? (
        // Catalog and Blob URLs are validated on the server before rendering.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width="72"
          height="72"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="order-product-fallback" aria-label="BLACKMARKET WHOLESALE product image unavailable">
          <strong>BLACKMARKET</strong>
          <em>Wholesale</em>
        </span>
      )}
    </span>
  );
}
