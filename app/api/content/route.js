import { contentStorageMode, publicContent, readContent, writeContent } from "./store.js";
import { isAdminRequest } from "../../lib/admin/auth.ts";
import { sendPushNotification } from "../../lib/push/send.ts";
import { cleanPushText } from "../../lib/push/validation.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const content = await readContent();
  const admin = await isAdminRequest(request);
  return Response.json(
    {
      ok: true,
      content: admin ? content : publicContent(content),
      storage: contentStorageMode(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let payload = await request.json().catch(() => null);
  if (!payload || !Array.isArray(payload.announcements) || !Array.isArray(payload.customProducts)) {
    return Response.json({ ok: false, message: "Invalid content payload." }, { status: 400 });
  }

  try {
    const current = await readContent();
    payload = {
      ...current,
      ...payload,
      assistantKnowledge: Array.isArray(payload.assistantKnowledge)
        ? payload.assistantKnowledge
        : current?.assistantKnowledge || [],
    };
    const content = await writeContent(payload);
    const notificationId = cleanPushText(payload.notificationAnnouncementId, 120);
    const announcement = notificationId
      ? content.announcements.find((entry) => String(entry.id) === notificationId)
      : null;
    if (announcement) {
      await sendPushNotification({
        eventId: `news:${notificationId}`,
        audience: "customer",
        message: {
          title: cleanPushText(announcement.title, 90) || "New BlackMarket update",
          body: cleanPushText(announcement.body, 160) || "Open News to see the latest update.",
          url: "/news",
          tag: `blackmarket-news-${notificationId}`,
        },
      }).catch((error) => console.error("News push notification failed:", error));
    }
    return Response.json(
      { ok: true, content, storage: contentStorageMode() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Content persistence failed:", error);
    return Response.json(
      { ok: false, message: "Portal content could not be saved to durable storage." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
