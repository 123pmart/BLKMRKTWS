import { isTrustedCatalogImageSource } from "../../../public/lib/catalog-image-source.js";

export { isTrustedCatalogImageSource, TRUSTED_PRODUCT_IMAGE_PATH } from "../../../public/lib/catalog-image-source.js";

export interface CatalogImageCandidate {
  variantOverrideImage?: string;
  variantImage?: string;
  productImage?: string;
  fallbackImage?: string;
}

export interface OrderImageLine {
  variantId?: string;
  productId?: string;
  item?: string;
  image?: string;
}

export interface CatalogImageItem {
  variantId: string;
  productId: string;
  item: string;
  image: string;
}

export function resolveCatalogProductImage(candidate: CatalogImageCandidate): string | null {
  const source = [candidate.variantOverrideImage, candidate.variantImage, candidate.productImage, candidate.fallbackImage]
    .map((value) => String(value ?? "").trim())
    .find(isTrustedCatalogImageSource);
  return source || null;
}

export function resolveOrderLineImage(line: OrderImageLine, catalog: CatalogImageItem[]): string | null {
  const saved = String(line.image ?? "").trim();
  if (isTrustedCatalogImageSource(saved)) return saved;
  const canonical = catalog.find((item) => line.variantId && item.variantId === line.variantId)
    || catalog.find((item) => line.item && item.item === line.item)
    || catalog.find((item) => line.productId && item.productId === line.productId);
  return canonical && isTrustedCatalogImageSource(canonical.image) ? canonical.image : null;
}
