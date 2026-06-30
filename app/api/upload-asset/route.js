import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const scope = safePart(form?.get("scope") || "asset");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, message: "Upload is missing a file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ ok: false, message: "Only image files are supported." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ ok: false, message: "Image is too large. Use a file under 8 MB." }, { status: 400 });
  }

  const extension = extensionFromFile(file);
  const pathname = `blackmarket/assets/${scope}/${Date.now()}-${safePart(file.name)}${extension}`;
  let blob;
  try {
    blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });
  } catch (error) {
    console.warn("Vercel Blob asset upload is unavailable:", error?.message || error);
    return Response.json(
      { ok: false, fallback: "client", message: "Cloud media storage is temporarily unavailable." },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    url: blob.url,
    pathname: blob.pathname,
  });
}

function isAdmin(request) {
  const password = process.env.ADMIN_PASS || "123pmart";
  return request.headers.get("x-admin-pass") === password;
}

function safePart(value) {
  return String(value || "asset")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64) || "asset";
}

function extensionFromFile(file) {
  const fromName = file.name.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
  if (fromName) return fromName;
  const fromType = file.type.split("/")[1];
  return fromType ? `.${fromType.replace("jpeg", "jpg")}` : ".png";
}
