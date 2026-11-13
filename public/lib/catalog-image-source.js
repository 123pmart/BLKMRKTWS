export const TRUSTED_PRODUCT_IMAGE_PATH = "/assets/";
const PUBLIC_BLOB_SUFFIX = ".public.blob.vercel-storage.com";

/** @param {unknown} value */
export function isTrustedCatalogImageSource(value) {
  const source = String(value ?? "").trim();
  if (!source) return false;
  if (source.startsWith("/")) {
    try {
      const decoded = decodeURIComponent(source.split(/[?#]/, 1)[0]);
      return decoded.startsWith(TRUSTED_PRODUCT_IMAGE_PATH) &&
        !decoded.includes("\\") && !decoded.split("/").includes("..");
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
