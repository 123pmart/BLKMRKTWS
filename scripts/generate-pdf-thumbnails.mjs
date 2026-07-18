import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(projectRoot, "public", "catalog-data.json");
const outputPath = path.join(projectRoot, "app", "lib", "orders", "pdf-product-thumbnails.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const items = {};
const variants = {};

for (const product of catalog.products || []) {
  for (const variant of product.variants || []) {
    const item = String(variant.item || "").trim();
    const variantId = String(variant.id || "").trim();
    const image = String(variant.bottle || product.bottle || "").trim();
    if (!item || !image.startsWith("/assets/")) continue;
    const pathname = decodeURIComponent(image.split(/[?#]/, 1)[0]).replace(/^\/+/, "");
    const source = path.resolve(projectRoot, "public", pathname);
    const publicRoot = path.resolve(projectRoot, "public");
    if (!source.startsWith(`${publicRoot}${path.sep}`)) throw new Error(`Invalid image path for item ${item}`);
    const thumbnail = await sharp(source)
      .resize(104, 104, { fit: "contain", background: "#f5f5f3" })
      .flatten({ background: "#f5f5f3" })
      .jpeg({ quality: 76, mozjpeg: true })
      .toBuffer();
    items[item] = thumbnail.toString("base64");
    if (variantId) variants[variantId] = item;
  }
}

const output = { version: 1, width: 104, height: 104, items, variants };
await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Generated ${Object.keys(items).length} bundled PDF product thumbnails.`);
