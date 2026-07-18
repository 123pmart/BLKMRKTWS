import { webPushConfigured, webPushPublicKey } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(
    { ok: true, configured: webPushConfigured(), publicKey: webPushPublicKey() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
