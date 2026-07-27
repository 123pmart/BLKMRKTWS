import "server-only";

import thumbnailData from "@/lib/orders/pdf-product-thumbnails.json";
import type { OrderLine } from "@/types";

interface PdfThumbnailData {
  version: number;
  width: number;
  height: number;
  images: Record<string, string>;
  items: Record<string, string>;
}

const thumbnails = thumbnailData as PdfThumbnailData;

export function bundledPdfProductThumbnail(line: Pick<OrderLine, "item" | "variantId">): string | null {
  const variantId = String(line.variantId || "").trim();
  const item = String(line.item || "").trim();
  const imageKey = (variantId && thumbnails.images[variantId] ? variantId : "") || thumbnails.items[item] || "";
  const encoded = thumbnails.images[imageKey];
  return encoded ? `data:image/jpeg;base64,${encoded}` : null;
}
