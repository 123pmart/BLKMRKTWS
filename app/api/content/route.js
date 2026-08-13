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

  const payload = await request.json().catch(() => null);
  if (!payload || !Array.isArray(payload.announcements) || !Array.isArray(payload.customProducts)) {
    return Response.json({ ok: false, message: "Invalid content payload." }, { status: 400 });
  }

  try {
    const content = await writeContent(payload);
    const notificationId = cleanPushText(payload.notificationAnnouncementId, 120);
    const announcement = notificationId
      ? content.announcements.find((entry) => String(entry.id) === notificationId)
      : null;
    let notification = null;
    if (announcement) {
      try {
        notification = await sendPushNotification({
          eventId: `news:${notificationId}`,
          audience: "customer",
          message: {
            title: "BLACKMARKET News Update",
            body: cleanPushText(announcement.title, 160) || "Open News to see the latest update.",
            url: "/news",
            tag: `blackmarket-news-${notificationId}`,
          },
        });
      } catch (error) {
        console.error("News push notification failed:", error);
        notification = { sent: 0, failed: 1, subscribers: 0, skipped: false };
      }
    }
    return Response.json(
      { ok: true, content, storage: contentStorageMode(), notification },
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
