import { readFile } from "node:fs/promises";
import path from "node:path";

export async function legacyPortalResponse() {
  const html = await readFile(path.join(process.cwd(), "public", "index.html"), "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
