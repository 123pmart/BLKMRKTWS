import "server-only";

interface RateRecord { count: number; resetAt: number }

const RATE_STATE = Symbol.for("blackmarket.account.rate-limit");
const root = globalThis as typeof globalThis & { [RATE_STATE]?: Map<string, RateRecord> };
const records = root[RATE_STATE] ?? new Map<string, RateRecord>();
root[RATE_STATE] = records;

export function consumeRateLimit(key: string, limit = 8, windowMs = 15 * 60_000): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = records.get(key);
  if (!existing || existing.resetAt <= now) {
    records.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  existing.count += 1;
  records.set(key, existing);
  return {
    allowed: existing.count <= limit,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function requestRateKey(request: Request, action: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${action}:${ip}`;
}
