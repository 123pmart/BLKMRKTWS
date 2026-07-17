export const TRUSTED_PRODUCT_IMAGE_PATH = "/assets/";
const PUBLIC_BLOB_SUFFIX = ".public.blob.vercel-storage.com";

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

export function isTrustedCatalogImageSource(value: unknown): boolean {
  const source = String(value ?? "").trim();
  if (!source) return false;
  if (source.startsWith("/")) {
    try {
      const decoded = decodeURIComponent(source.split(/[?#]/, 1)[0]);
      return decoded.startsWith(TRUSTED_PRODUCT_IMAGE_PATH) && !decoded.split("/").includes("..");
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(source);
    return url.protocol === "https:" && url.hostname.endsWith(PUBLIC_BLOB_SUFFIX) && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

export function trustedCatalogImageUrl(source: unknown, assetOrigin?: string): string | null {
  const value = String(source ?? "").trim();
  if (!isTrustedCatalogImageSource(value)) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (!assetOrigin) return null;
  try {
    const origin = new URL(assetOrigin);
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) return null;
    return new URL(value, origin.origin).toString();
  } catch {
    return null;
  }
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
