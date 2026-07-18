import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const catalogPath = path.join(publicRoot, "catalog-data.json");
const outputDirectory = path.join(publicRoot, "assets", "catalog-cards");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
let sourceBytes = 0;
let outputBytes = 0;
let generated = 0;

await mkdir(outputDirectory, { recursive: true });
await Promise.all((await readdir(outputDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".webp"))
  .map((entry) => unlink(path.join(outputDirectory, entry.name))));

for (const product of catalog.products || []) {
  for (const variant of product.variants || []) {
    const sourceUrl = String(variant.bottle || product.bottle || "").trim();
    if (!sourceUrl.startsWith("/assets/")) continue;
    const sourcePath = path.resolve(publicRoot, decodeURIComponent(sourceUrl.split(/[?#]/, 1)[0]).replace(/^\/+/, ""));
    if (!sourcePath.startsWith(`${publicRoot}${path.sep}`)) throw new Error(`Invalid catalog image path for ${variant.id}`);
    const stem = String(variant.id || `${product.id}-${variant.item}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const inputStats = await stat(sourcePath);
    const optimized = await sharp(sourcePath)
      .rotate()
      .resize(640, 640, { fit: "contain", withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 90, effort: 6 })
      .toBuffer();
    const fingerprint = createHash("sha256").update(optimized).digest("hex").slice(0, 12);
    const filename = `${stem}-${fingerprint}.webp`;
    const outputPath = path.join(outputDirectory, filename);
    await writeFile(outputPath, optimized);
    sourceBytes += inputStats.size;
    outputBytes += optimized.byteLength;
    generated += 1;
    variant.cardImage = `/assets/catalog-cards/${filename}`;
  }
}

await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated ${generated} card images: ${(sourceBytes / 1048576).toFixed(2)} MB -> ${(outputBytes / 1048576).toFixed(2)} MB.`);
