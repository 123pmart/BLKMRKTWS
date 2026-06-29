import { contentStorageMode, publicContent, readContent, writeContent } from "./store.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const content = await readContent();
  return Response.json(
    {
      ok: true,
      content: isAdmin(request) ? content : publicContent(content),
      storage: contentStorageMode(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request) {
  if (!isAdmin(request)) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || !Array.isArray(payload.announcements) || !Array.isArray(payload.customProducts)) {
    return Response.json({ ok: false, message: "Invalid content payload." }, { status: 400 });
  }

  const content = await writeContent(payload);
  return Response.json({ ok: true, content, storage: contentStorageMode() });
}

function isAdmin(request) {
  const password = process.env.ADMIN_PASS || "123pmart";
  return request.headers.get("x-admin-pass") === password;
}
