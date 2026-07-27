import { NextResponse } from "next/server";

import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getAssistantAvailability } from "@/lib/assistant/availability";
import { loadAssistantProducts } from "@/lib/assistant/catalog";
import { answerAssistantQuestion } from "@/lib/assistant/engine";
import type { AssistantContext } from "@/lib/assistant/types";

export const runtime = "nodejs";

interface AssistantAnswerBody {
  question?: unknown;
  context?: unknown;
  cart?: unknown;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return noStore({ error: "Cross-origin assistant requests are not allowed." }, 403);
  }
  const [availability, adminIdentity, verifiedAccount] = await Promise.all([
    getAssistantAvailability(),
    getAdminIdentity(request),
    getVerifiedStoreAccount(request),
  ]);
  if (!availability.enabled && !adminIdentity) {
    return noStore({ error: "BLACKMARKET AI is not available." }, 404);
  }

  let body: AssistantAnswerBody;
  try {
    body = await request.json() as AssistantAnswerBody;
  } catch {
    return noStore({ error: "Invalid request." }, 400);
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 1000) {
    return noStore({ error: "Enter a question up to 1,000 characters." }, 400);
  }

  const context = sanitizeContext(body.context);
  const cart = sanitizeCart(body.cart);
  const products = await loadAssistantProducts(verifiedAccount?.account.priceOverrides ?? []);
  const response = answerAssistantQuestion(question, products, { context, cart });
  return noStore({ response }, 200);
}

function sanitizeContext(value: unknown): AssistantContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { productIds: [], variantIds: [] };
  const record = value as Record<string, unknown>;
  return {
    productIds: stringArray(record.productIds, 8),
    variantIds: stringArray(record.variantIds, 8),
    lastIntent: typeof record.lastIntent === "string" ? record.lastIntent as AssistantContext["lastIntent"] : undefined,
  };
}

function sanitizeCart(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([variantId, rawQuantity]) => {
    if (!/^[a-z0-9][a-z0-9-]{1,180}$/i.test(variantId)) return [];
    const quantity = Math.min(999, Math.max(0, Math.floor(Number(rawQuantity) || 0)));
    return quantity ? [[variantId, quantity]] : [];
  }).slice(0, 200));
}

function stringArray(value: unknown, maximum: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && /^[a-z0-9][a-z0-9-]{1,180}$/i.test(item)))].slice(0, maximum);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const suppliedOrigin = new URL(origin).origin;
    if (suppliedOrigin === new URL(request.url).origin) return true;
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!forwardedHost) return false;
    const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return suppliedOrigin === `${forwardedProtocol}://${forwardedHost}`;
  } catch {
    return false;
  }
}

function noStore(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
