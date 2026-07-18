import { updateAccount } from "@/lib/account/account-store";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { publicStoreProfile, validateStoreProfile } from "@/lib/account/profile";
import { isSameOriginRequest } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const verified = await getVerifiedStoreAccount(request);
  if (!verified) return unauthorized();
  return Response.json({ ok: true, profile: publicStoreProfile(verified.account.store) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ ok: false, message: "Invalid request origin." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const verified = await getVerifiedStoreAccount(request);
  if (!verified) return unauthorized();
  const input = await request.json().catch(() => ({}));
  const validation = validateStoreProfile(input);
  if (!validation.ok) {
    return Response.json({ ok: false, message: "Review the highlighted fields.", errors: validation.errors }, {
      status: 400, headers: { "Cache-Control": "private, no-store" },
    });
  }
  const updated = await updateAccount(verified.account.username, (account) => ({
    ...account,
    email: validation.value.email,
    store: {
      ...account.store,
      ...validation.value,
      // Salesperson and ownership are deliberately retained from the server record.
      salesperson: account.store.salesperson,
      id: account.store.id,
      updatedAt: new Date().toISOString(),
    },
  }));
  return Response.json({ ok: true, profile: publicStoreProfile(updated.store) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

function unauthorized() {
  return Response.json({ ok: false, message: "Verified store sign-in is required." }, {
    status: 401, headers: { "Cache-Control": "private, no-store" },
  });
}
