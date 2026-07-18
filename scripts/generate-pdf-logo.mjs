import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "public", "assets", "brand", "blackmarket-wholesale-order-logo.jpg");
const outputPath = path.join(projectRoot, "app", "lib", "orders", "pdf-brand-logo.json");
const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();

if (metadata.format !== "jpeg" || !metadata.width || !metadata.height) {
  throw new Error("The order logo must be a readable JPEG image.");
}

const output = {
  version: 1,
  mimeType: "image/jpeg",
  width: metadata.width,
  height: metadata.height,
  data: source.toString("base64"),
};

await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Bundled the ${metadata.width}x${metadata.height} order logo without altering its pixels.`);
