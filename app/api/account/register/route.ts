import { randomUUID } from "node:crypto";

import { createAccount, newAccountId, newStoreId, UsernameConflictError } from "@/lib/account/account-store";
import { hashPassword } from "@/lib/account/password";
import { consumeRateLimit, requestRateKey } from "@/lib/account/rate-limit";
import { validateRegistration } from "@/lib/account/validation";
import type { StoreAccount } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = consumeRateLimit(requestRateKey(request, "register"), 5, 60 * 60_000);
  if (!rate.allowed) {
    return Response.json({ ok: false, message: "Too many attempts. Try again later." }, {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfter) },
    });
  }

  const input = await request.json().catch(() => ({}));
  const validation = validateRegistration(input);
  if (!validation.ok || !validation.value) {
    return Response.json({ ok: false, message: "Review the highlighted fields.", errors: validation.errors }, {
      status: 400, headers: { "Cache-Control": "no-store" },
    });
  }

  const value = validation.value;
  const now = new Date().toISOString();
  const storeId = newStoreId();
  const account: StoreAccount = {
    id: newAccountId(),
    storeId,
    username: value.username,
    email: value.email,
    passwordHash: await hashPassword(value.password),
    status: "pending",
    store: {
      id: storeId,
      storeName: value.storeName,
      contactName: value.contactName,
      email: value.email,
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    priceOverrides: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createAccount(account);
    return Response.json({
      ok: true,
      status: "pending",
      message: "Account request received. You can sign in after approval.",
      requestId: `req_${randomUUID().slice(0, 12)}`,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UsernameConflictError) {
      return Response.json({ ok: false, message: "That username is unavailable.", errors: { username: "Choose another username." } }, {
        status: 409, headers: { "Cache-Control": "no-store" },
      });
    }
    console.error("Store account registration failed:", error);
    return Response.json({ ok: false, message: "Account registration is temporarily unavailable." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
