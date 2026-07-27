import { readContent, writeContent } from "@/api/content/store.js";
import { getAdminIdentity } from "@/lib/admin/auth";
import type { ProductKnowledgeOverride } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const content = await readContent();
  return Response.json({
    ok: true,
    records: Array.isArray(content?.assistantKnowledge) ? content.assistantKnowledge : [],
    canVerify: identity.scope === "all",
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ ok: false, message: "Invalid request origin" }, { status: 403 });

  const payload = await request.json().catch(() => null) as { record?: unknown } | null;
  const record = cleanRecord(payload?.record);
  if (!record) return Response.json({ ok: false, message: "Invalid Assistant Knowledge record." }, { status: 400 });
  if (identity.scope !== "all" && (record.verification === "verified" || record.formula?.verification === "verified")) {
    return Response.json({ ok: false, message: "Only Parker can mark Assistant Knowledge as verified." }, { status: 403 });
  }

  try {
    const current = await readContent();
    const records = Array.isArray(current?.assistantKnowledge)
      ? current.assistantKnowledge.filter((entry: { productId?: string }) => entry?.productId !== record.productId)
      : [];
    const savedRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      updatedBy: identity.username,
    };
    const content = await writeContent({
      ...current,
      assistantKnowledge: [...records, savedRecord],
    });
    return Response.json(
      { ok: true, record: savedRecord, storage: content ? "connected" : "unavailable" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Assistant Knowledge save failed:", error);
    return Response.json(
      { ok: false, message: "Assistant Knowledge could not be saved to durable storage." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

function cleanRecord(value: unknown): ProductKnowledgeOverride | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const productId = clean(raw.productId, 160);
  if (!productId) return null;
  const formula = cleanFormula(raw.formula);
  const verification = cleanVerification(raw.verification);
  return {
    productId,
    shortName: cleanOptional(raw.shortName, 100),
    aliases: cleanStrings(raw.aliases, 80, 100),
    commonMisspellings: cleanStrings(raw.commonMisspellings, 80, 100),
    purpose: cleanOptional(raw.purpose, 1200),
    retailerPitch: cleanOptional(raw.retailerPitch, 1200),
    bestFor: cleanStrings(raw.bestFor, 50, 300),
    notIdealFor: cleanStrings(raw.notIdealFor, 50, 300),
    keyDifferentiators: cleanStrings(raw.keyDifferentiators, 50, 300),
    goals: cleanGoals(raw.goals),
    ...(formula ? { formula } : {}),
    relationships: cleanRelationships(raw.relationships),
    approvedFaqs: cleanFaqs(raw.approvedFaqs),
    prohibitedClaims: cleanStrings(raw.prohibitedClaims, 50, 300),
    ...(verification ? { verification } : {}),
  };
}

function cleanFormula(value: unknown): ProductKnowledgeOverride["formula"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const verification = cleanVerification(raw.verification) ?? "needs-review";
  const total = raw.totalCaffeineMg === null || raw.totalCaffeineMg === "" ? undefined : finiteNumber(raw.totalCaffeineMg, 0, 2000);
  const servings = raw.servingsPerContainer === null || raw.servingsPerContainer === "" ? undefined : finiteNumber(raw.servingsPerContainer, 1, 1000);
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.slice(0, 200).flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const item = entry as Record<string, unknown>;
        const name = clean(item.name, 160);
        if (!name) return [];
        const amount = item.amount === null || item.amount === "" ? undefined : finiteNumber(item.amount, 0, 1_000_000);
        const unit = ["mcg", "mg", "g"].includes(String(item.unit)) ? String(item.unit) as "mcg" | "mg" | "g" : undefined;
        return [{
          name,
          normalizedName: clean(item.normalizedName, 160) || normalize(name),
          ...(amount === undefined ? {} : { amount }),
          ...(unit ? { unit } : {}),
          servingBasis: clean(item.servingBasis, 100) || "full serving",
          disclosure: ["exact", "blend-total", "listed-in-blend", "official-highlight"].includes(String(item.disclosure))
            ? item.disclosure as "exact" | "blend-total" | "listed-in-blend" | "official-highlight"
            : amount === undefined ? "official-highlight" : "exact",
          roles: cleanStrings(item.roles, 12, 40) as ProductKnowledgeOverride["formula"] extends { ingredients: infer T } ? T extends Array<infer I> ? I extends { roles: infer R } ? R : never : never : never,
          verified: Boolean(item.verified),
          sourceIds: cleanStrings(item.sourceIds, 20, 180),
        }];
      })
    : [];
  return {
    servingSize: cleanOptional(raw.servingSize, 160),
    ...(servings === undefined ? {} : { servingsPerContainer: servings }),
    ...(total === undefined ? {} : { totalCaffeineMg: total }),
    caffeineServingBasis: cleanOptional(raw.caffeineServingBasis, 120),
    stimulantFree: Boolean(raw.stimulantFree),
    ingredients,
    warnings: cleanStrings(raw.warnings, 50, 300),
    verification,
    reviewNotes: cleanStrings(raw.reviewNotes, 50, 500),
  };
}

function cleanRelationships(value: unknown): ProductKnowledgeOverride["relationships"] {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    commonlyComparedWith: cleanStrings(raw.commonlyComparedWith, 50, 160),
    complements: cleanStrings(raw.complements, 50, 160),
    substitutes: cleanStrings(raw.substitutes, 50, 160),
  };
}

function cleanFaqs(value: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    const question = clean(item.question, 300);
    const answer = clean(item.answer, 1600);
    return question && answer ? [{ question, answer }] : [];
  });
}

function cleanGoals(value: unknown): ProductKnowledgeOverride["goals"] {
  const allowed = new Set(["cutting", "energy", "focus", "pump", "strength", "recovery", "daily", "stim-free", "performance", "hydration"]);
  return cleanStrings(value, 20, 40).filter((entry) => allowed.has(entry)) as ProductKnowledgeOverride["goals"];
}

function cleanVerification(value: unknown): ProductKnowledgeOverride["verification"] | undefined {
  return ["unverified", "needs-review", "verified", "archived"].includes(String(value))
    ? value as ProductKnowledgeOverride["verification"]
    : undefined;
}

function cleanStrings(value: unknown, maximum: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => clean(entry, maxLength)).filter(Boolean))].slice(0, maximum);
}

function cleanOptional(value: unknown, maximum: number): string | undefined {
  const result = clean(value, maximum);
  return result || undefined;
}

function clean(value: unknown, maximum: number): string {
  return String(value ?? "").trim().slice(0, maximum);
}

function finiteNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : undefined;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[™®]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
