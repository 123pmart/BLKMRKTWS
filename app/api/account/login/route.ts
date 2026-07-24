import { getAccountByUsername, updateAccount } from "@/lib/account/account-store";
import { verifyPassword } from "@/lib/account/password";
import { consumeRateLimit, requestRateKey } from "@/lib/account/rate-limit";
import { createAccountSession, setAccountSessionCookie } from "@/lib/account/session";
import { validateLogin } from "@/lib/account/validation";
import { isPortalMaintenanceMode } from "@/lib/maintenance/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Username or password is incorrect.";

export async function POST(request: Request) {
  if (await isPortalMaintenanceMode()) {
    return Response.json({ ok: false, message: "Store sign-in is temporarily unavailable during maintenance." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "3600" },
    });
  }

  const rate = consumeRateLimit(requestRateKey(request, "login"), 8, 15 * 60_000);
  if (!rate.allowed) {
    return Response.json({ ok: false, message: "Too many sign-in attempts. Try again later." }, {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfter) },
    });
  }

  const input = await request.json().catch(() => ({}));
  const validation = validateLogin(input);
  if (!validation.ok || !validation.value) {
    return Response.json({ ok: false, message: GENERIC_ERROR }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const account = await getAccountByUsername(validation.value.username);
    const valid = account ? await verifyPassword(validation.value.password, account.passwordHash) : false;
    if (!account || !valid || account.status === "disabled") {
      return Response.json({ ok: false, message: GENERIC_ERROR }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const updated = await updateAccount(account.username, (record) => ({ ...record, status: record.status === "pending" ? "active" : record.status, lastLoginAt: new Date().toISOString() }));
    const token = await createAccountSession(updated.id, updated.username);
    await setAccountSessionCookie(token);
    return Response.json({
      ok: true,
      account: {
        username: updated.username,
        storeName: updated.store.storeName,
        status: updated.status,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Store account login failed:", error);
    return Response.json({ ok: false, message: "Sign-in is temporarily unavailable." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
