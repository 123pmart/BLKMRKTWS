export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const requestUrl = new URL(request.url);
      const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
      const host = forwardedHost || request.headers.get("host") || requestUrl.host;
      const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const protocol = forwardedProtocol || requestUrl.protocol.replace(/:$/, "");
      return new URL(origin).origin === `${protocol}://${host}`;
    } catch {
      return false;
    }
  }

  // Some same-origin browser and installed-PWA requests omit Origin. Fetch
  // Metadata is the strongest available signal in that case. The explicit
  // JSON request marker is a fallback for older WebKit builds; because it is a
  // non-simple header, a cross-origin caller cannot send it without a CORS
  // preflight, which this API does not permit.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin") return true;
  const isJson = request.headers.get("content-type")?.toLowerCase().includes("application/json") === true;
  if (!isJson) return false;
  if (request.headers.get("x-blackmarket-request") === "portal") return true;

  // Cross-site browser JSON requests require a CORS preflight and send Origin;
  // the API permits neither a foreign Origin nor CORS. Accepting JSON when
  // both Origin and Fetch Metadata are absent keeps older installed WebKit
  // clients working without making form-based CSRF possible.
  return fetchSite === null;
}
