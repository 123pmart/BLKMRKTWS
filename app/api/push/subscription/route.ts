import { getAdminIdentity } from "@/lib/admin/auth";
import { consumeRateLimit, requestRateKey } from "@/lib/account/rate-limit";
import { deactivatePushSubscription, pushEndpointHash, savePushSubscription } from "@/lib/push/store";
import type { StoredPushSubscription } from "@/lib/push/types";
import { isPushAudience, normalizeBrowserPushSubscription } from "@/lib/push/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return response({ ok: false, message: "Invalid request origin." }, 403);
  const rate = consumeRateLimit(requestRateKey(request, "push-subscribe"), 30, 15 * 60_000);
  if (!rate.allowed) return response({ ok: false, message: "Too many notification requests." }, 429, { "Retry-After": String(rate.retryAfter) });

  const payload = await request.json().catch(() => null) as { audience?: unknown; subscription?: unknown } | null;
  const audience = payload?.audience;
  const subscription = normalizeBrowserPushSubscription(payload?.subscription);
  if (!isPushAudience(audience) || !subscription) return response({ ok: false, message: "Invalid push subscription." }, 400);

  const adminIdentity = audience === "admin" ? await getAdminIdentity(request) : null;
  if (audience === "admin" && !adminIdentity) return response({ ok: false, message: "Admin sign-in required." }, 401);

  const now = new Date();
  const lifetime = audience === "admin" ? 30 * 24 * 60 * 60_000 : 365 * 24 * 60 * 60_000;
  const record: StoredPushSubscription = {
    endpointHash: pushEndpointHash(subscription.endpoint),
    subscription,
    audience,
    ...(adminIdentity ? { adminIdentity } : {}),
    active: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + lifetime).toISOString(),
  };

  try {
    await savePushSubscription(record);
    return response({ ok: true, audience });
  } catch (error) {
    console.error("Push subscription persistence failed:", error);
    return response({ ok: false, message: "Notification subscription could not be saved." }, 503);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return response({ ok: false, message: "Invalid request origin." }, 403);
  const payload = await request.json().catch(() => null) as { endpoint?: unknown } | null;
  const endpoint = String(payload?.endpoint || "").trim();
  if (!endpoint.startsWith("https://") || endpoint.length > 2048) return response({ ok: false, message: "Invalid endpoint." }, 400);
  try {
    await deactivatePushSubscription(endpoint);
    return response({ ok: true });
  } catch (error) {
    console.error("Push subscription removal failed:", error);
    return response({ ok: false, message: "Notification subscription could not be removed." }, 503);
  }
}

function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestOrigin = new URL(request.url).origin;
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    const forwardedOrigin = forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : requestOrigin;
    return new URL(origin).origin === requestOrigin || new URL(origin).origin === forwardedOrigin;
  } catch {
    return false;
  }
}

function response(body: object, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}
