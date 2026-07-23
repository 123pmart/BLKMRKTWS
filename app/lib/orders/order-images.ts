import "server-only";

import { isEmbeddedCatalogImageSource } from "@/lib/catalog/embedded-image";
import { resolveOrderLineImage } from "@/lib/catalog/image-core";
import { loadServerCatalog } from "@/lib/catalog/server-catalog";
import type { Order } from "@/types";

export async function withResolvedOrderImages(order: Order): Promise<Order> {
  const catalog = await loadServerCatalog({ includeEmbeddedImages: true });
  return {
    ...order,
    lines: order.lines.map((line) => {
      const trusted = resolveOrderLineImage(line, catalog);
      const canonical = catalog.find((item) => line.variantId && item.variantId === line.variantId)
        || catalog.find((item) => line.item && item.item === line.item)
        || catalog.find((item) => line.productId && item.productId === line.productId);
      const embedded = isEmbeddedCatalogImageSource(String(line.image || "")) ? String(line.image) :
        (canonical && isEmbeddedCatalogImageSource(canonical.image) ? canonical.image : "");
      return { ...line, image: trusted || embedded || undefined };
    }),
  };
}
