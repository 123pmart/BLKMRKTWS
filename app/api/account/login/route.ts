import { getAccountByUsername, updateAccount } from "@/lib/account/account-store";
import { verifyPassword } from "@/lib/account/password";
import { consumeRateLimit, requestRateKey } from "@/lib/account/rate-limit";
import { createAccountSession, setAccountSessionCookie } from "@/lib/account/session";
import { validateLogin } from "@/lib/account/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Username or password is incorrect.";

export async function POST(request: Request) {
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

    if (account.status === "pending") {
      return Response.json({ ok: false, code: "APPROVAL_PENDING", message: "Your access request is awaiting approval." }, {
        status: 403, headers: { "Cache-Control": "no-store" },
      });
    }

    const updated = await updateAccount(account.username, (record) => ({ ...record, lastLoginAt: new Date().toISOString() }));
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
