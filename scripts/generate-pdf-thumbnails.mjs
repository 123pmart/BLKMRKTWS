import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(projectRoot, "public", "catalog-data.json");
const outputPath = path.join(projectRoot, "app", "lib", "orders", "pdf-product-thumbnails.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const entries = (catalog.products || []).flatMap((product) =>
  (product.variants || []).map((variant) => ({
    item: String(variant.item || "").trim(),
    variantId: String(variant.id || "").trim(),
    image: String(variant.bottle || product.bottle || "").trim(),
  })),
);
const itemCounts = entries.reduce((counts, entry) => {
  if (entry.item) counts.set(entry.item, (counts.get(entry.item) || 0) + 1);
  return counts;
}, new Map());
const images = {};
const items = {};

for (const { item, variantId, image } of entries) {
  if (!item || !variantId || !image.startsWith("/assets/")) continue;
  const pathname = decodeURIComponent(image.split(/[?#]/, 1)[0]).replace(/^\/+/, "");
  const source = path.resolve(projectRoot, "public", pathname);
  const publicRoot = path.resolve(projectRoot, "public");
  if (!source.startsWith(`${publicRoot}${path.sep}`)) throw new Error(`Invalid image path for item ${item}`);
  const thumbnail = await sharp(source)
    .resize(104, 104, { fit: "contain", background: "#f5f5f3" })
    .flatten({ background: "#f5f5f3" })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();
  images[variantId] = thumbnail.toString("base64");
  // SKU-only fallback is safe only when the item number identifies exactly one variant.
  if (itemCounts.get(item) === 1) items[item] = variantId;
}

const output = { version: 2, width: 104, height: 104, images, items };
await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Generated ${Object.keys(images).length} bundled PDF product thumbnails.`);
