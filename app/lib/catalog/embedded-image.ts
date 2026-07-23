const MAX_EMBEDDED_IMAGE_BYTES = 8 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=\r\n]+)$/i;

export function decodeEmbeddedCatalogImage(source: string): Buffer | null {
  const match = String(source || "").trim().match(DATA_IMAGE_PATTERN);
  if (!match) return null;

  const encoded = match[2].replace(/\s+/g, "");
  if (!encoded || encoded.length > Math.ceil(MAX_EMBEDDED_IMAGE_BYTES * 4 / 3) + 4) return null;

  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.byteLength || bytes.byteLength > MAX_EMBEDDED_IMAGE_BYTES) return null;
  return matchesDeclaredImageType(match[1].toLowerCase(), bytes) ? bytes : null;
}

export function isEmbeddedCatalogImageSource(source: string): boolean {
  return decodeEmbeddedCatalogImage(source) !== null;
}

function matchesDeclaredImageType(type: string, bytes: Buffer): boolean {
  if (type === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (type === "png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}
