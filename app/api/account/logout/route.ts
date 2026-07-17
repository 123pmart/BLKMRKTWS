import { clearAccountSession, readSessionToken } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await clearAccountSession(await readSessionToken(request));
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
