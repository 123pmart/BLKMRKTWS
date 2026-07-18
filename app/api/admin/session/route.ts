import { adminAuthConfigured, clearAdminSession, getAdminIdentity, setAdminSession, verifyAdminCredentials } from "@/lib/admin/auth";
import { consumeRateLimit, requestRateKey } from "@/lib/account/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getAdminIdentity(request);
  return Response.json({ ok: true, authenticated: Boolean(identity), identity, configured: adminAuthConfigured() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const rate = consumeRateLimit(requestRateKey(request, "admin-login"), 8, 15 * 60_000);
  if (!rate.allowed) return Response.json({ ok: false, message: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter), "Cache-Control": "no-store" } });
  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  const identity = verifyAdminCredentials(String(body.username || ""), String(body.password || ""));
  if (!identity) {
    return Response.json({ ok: false, message: "Invalid admin login." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  await setAdminSession(identity);
  return Response.json({ ok: true, identity }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
