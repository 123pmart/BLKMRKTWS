import "server-only";

import thumbnailData from "@/lib/orders/pdf-product-thumbnails.json";
import type { OrderLine } from "@/types";

interface PdfThumbnailData {
  version: number;
  width: number;
  height: number;
  items: Record<string, string>;
  variants: Record<string, string>;
}

const thumbnails = thumbnailData as PdfThumbnailData;

export function bundledPdfProductThumbnail(line: Pick<OrderLine, "item" | "variantId">): string | null {
  const item = String(line.item || thumbnails.variants[String(line.variantId || "")] || "").trim();
  const encoded = thumbnails.items[item];
  return encoded ? `data:image/jpeg;base64,${encoded}` : null;
}
