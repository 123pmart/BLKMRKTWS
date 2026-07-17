import "server-only";

import { resolveOrderLineImage } from "@/lib/catalog/image-core";
import { loadServerCatalog } from "@/lib/catalog/server-catalog";
import type { Order } from "@/types";

export async function withResolvedOrderImages(order: Order): Promise<Order> {
  const catalog = await loadServerCatalog();
  return {
    ...order,
    lines: order.lines.map((line) => ({
      ...line,
      image: resolveOrderLineImage(line, catalog) || undefined,
    })),
  };
}
