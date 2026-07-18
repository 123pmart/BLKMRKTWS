import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";

import { isTrustedCatalogImageSource } from "@/lib/catalog/image-core";
import { bundledPdfProductThumbnail } from "@/lib/orders/pdf-product-thumbnails";
import type { Order, OrderLine } from "@/types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 42;
const GOLD = rgb(0.965, 0.851, 0);
const BLACK = rgb(0.025, 0.025, 0.03);
const DARK = rgb(0.12, 0.12, 0.13);
const MID = rgb(0.42, 0.42, 0.45);
const LINE = rgb(0.86, 0.86, 0.85);
const WHITE = rgb(1, 1, 1);

interface Fonts { regular: PDFFont; bold: PDFFont }

export async function generateOrderConfirmationPdf(order: Order): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`BLACKMARKET Wholesale Order ${order.id}`);
  pdf.setAuthor("BlackMarketLabs");
  pdf.setSubject("Wholesale Order Confirmation");
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const thumbnails = new Map<string, PDFImage | null>();
  const pages: PDFPage[] = [];

  let page = addPage(pdf);
  pages.push(page);
  let y = drawFirstPageHeader(page, order, fonts);
  y = drawDetails(page, order, fonts, y);
  y = drawProductHeading(page, fonts, y - 16);

  for (const line of order.lines) {
    const titleLines = wrap(line.product || "Product", fonts.bold, 9.5, 225, 2);
    const flavorLines = wrap(line.flavor || "", fonts.regular, 8, 225, 1);
    const rowHeight = Math.max(58, 24 + (titleLines.length + flavorLines.length) * 10);
    if (y - rowHeight < 132) {
      page = addPage(pdf);
      pages.push(page);
      y = drawContinuationHeader(page, order, fonts);
      y = drawProductHeading(page, fonts, y - 14);
    }
    const image = await loadThumbnail(pdf, line, thumbnails);
    drawProductRow(page, line, image, fonts, y, rowHeight, titleLines, flavorLines);
    y -= rowHeight;
  }

  if (y < minimumTotalsStart(order)) {
    page = addPage(pdf);
    pages.push(page);
    y = drawContinuationHeader(page, order, fonts);
  }
  drawTotals(page, order, fonts, y - 22);
  pages.forEach((current, index) => drawFooter(current, order, fonts, index + 1, pages.length));
  return pdf.save({ useObjectStreams: true });
}

function addPage(pdf: PDFDocument): PDFPage {
  return pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function drawFirstPageHeader(page: PDFPage, order: Order, fonts: Fonts): number {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 74, width: PAGE_WIDTH, height: 74, color: BLACK });
  drawCenteredWordmark(page, fonts, PAGE_HEIGHT - 49, 21, WHITE);

  const labels = ["ORDER NUMBER", "ORDER DATE", "STATUS"];
  const values = [order.id, dateLabel(order.date), String(order.status || "Received").toUpperCase()];
  const columnWidth = (PAGE_WIDTH - MARGIN * 2) / 3;
  labels.forEach((label, index) => {
    const center = MARGIN + columnWidth * index + columnWidth / 2;
    centeredText(page, fonts, label, center, PAGE_HEIGHT - 102, 6.5, MID, true);
    centeredText(page, fonts, safeText(values[index]), center, PAGE_HEIGHT - 117, 8.7, DARK, true);
  });
  page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 133 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 133 }, thickness: .7, color: LINE });
  return PAGE_HEIGHT - 154;
}

function drawContinuationHeader(page: PDFPage, order: Order, fonts: Fonts): number {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 60, width: PAGE_WIDTH, height: 60, color: BLACK });
  drawCenteredWordmark(page, fonts, PAGE_HEIGHT - 37, 16, WHITE);
  rightText(page, fonts, order.id, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 51, 7, MID, true);
  return PAGE_HEIGHT - 82;
}

function drawDetails(page: PDFPage, order: Order, fonts: Fonts, y: number): number {
  page.drawText("DETAILS", { x: MARGIN, y, size: 7.5, font: fonts.bold, color: GOLD });
  page.drawLine({ start: { x: MARGIN + 46, y: y + 2 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 2 }, thickness: .6, color: LINE });
  const leftX = MARGIN;
  const rightX = 326;
  const startY = y - 22;
  detailValue(page, fonts, leftX, startY, "STORE", order.store.storeName || "Store");
  detailValue(page, fonts, rightX, startY, "CONTACT", order.store.contactName || "-");
  detailValue(page, fonts, leftX, startY - 31, "SHIP TO", shippingLabel(order));
  detailValue(page, fonts, rightX, startY - 31, "EMAIL / PHONE", [order.store.email, order.store.phone].filter(Boolean).join("  /  ") || "-");
  return y - 79;
}

function detailValue(page: PDFPage, fonts: Fonts, x: number, y: number, label: string, value: string): void {
  page.drawText(label, { x, y, size: 6.3, font: fonts.bold, color: MID });
  const lines = wrap(value, fonts.regular, 8.5, 225, 2);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - 13 - index * 10, size: 8.5, font: index === 0 ? fonts.bold : fonts.regular, color: DARK }));
}

function drawProductHeading(page: PDFPage, fonts: Fonts, y: number): number {
  page.drawText("PRODUCTS", { x: MARGIN, y, size: 7.5, font: fonts.bold, color: GOLD });
  page.drawRectangle({ x: MARGIN, y: y - 31, width: PAGE_WIDTH - MARGIN * 2, height: 23, color: BLACK });
  page.drawText("IMAGE", { x: MARGIN + 8, y: y - 23, size: 6.8, font: fonts.bold, color: WHITE });
  page.drawText("ITEM", { x: MARGIN + 62, y: y - 23, size: 6.8, font: fonts.bold, color: WHITE });
  page.drawText("PRODUCT", { x: MARGIN + 116, y: y - 23, size: 6.8, font: fonts.bold, color: WHITE });
  rightText(page, fonts, "QTY", 432, y - 23, 6.8, WHITE, true);
  rightText(page, fonts, "UNIT", 495, y - 23, 6.8, WHITE, true);
  rightText(page, fonts, "TOTAL", PAGE_WIDTH - MARGIN - 8, y - 23, 6.8, WHITE, true);
  return y - 31;
}

function drawProductRow(page: PDFPage, line: OrderLine, image: PDFImage | null, fonts: Fonts, y: number, height: number, titleLines: string[], flavorLines: string[]): void {
  page.drawRectangle({ x: MARGIN, y: y - height, width: PAGE_WIDTH - MARGIN * 2, height, color: WHITE, borderColor: LINE, borderWidth: .45 });
  if (image) page.drawImage(image, { x: MARGIN + 8, y: y - height + 6, width: 46, height: 46 });
  page.drawText(safeText(line.item || "-"), { x: MARGIN + 62, y: y - height / 2 - 3, size: 8, font: fonts.bold, color: MID });

  let textY = y - 16;
  titleLines.forEach((lineText) => { page.drawText(lineText, { x: MARGIN + 116, y: textY, size: 9.5, font: fonts.bold, color: BLACK }); textY -= 10.5; });
  flavorLines.forEach((lineText) => { page.drawText(lineText, { x: MARGIN + 116, y: textY, size: 8, font: fonts.regular, color: MID }); textY -= 9; });
  const baseline = y - height / 2 - 3;
  rightText(page, fonts, String(line.qty), 432, baseline, 8.7, DARK);
  rightText(page, fonts, money(unitPrice(line)), 495, baseline, 8.7, DARK);
  rightText(page, fonts, money(line.lineWholesale), PAGE_WIDTH - MARGIN - 8, baseline, 9, BLACK, true);
}

function drawTotals(page: PDFPage, order: Order, fonts: Fonts, y: number): void {
  const totals = order.totals;
  const width = 226;
  const x = PAGE_WIDTH - MARGIN - width;
  const rows: Array<[string, number, boolean]> = [
    ...(totals.discount ? [
      ["Standard subtotal", totals.subtotal ?? totals.wholesale, false] as [string, number, boolean],
      ["Account savings", -totals.discount, false] as [string, number, boolean],
    ] : []),
    [totals.discount ? "Final subtotal" : "Subtotal", totals.wholesale, false],
    ...(totals.shipping ? [["Shipping", totals.shipping, false] as [string, number, boolean]] : []),
    ...(totals.tax ? [["Tax", totals.tax, false] as [string, number, boolean]] : []),
    ["TOTAL", totals.grandTotal ?? totals.wholesale, true],
  ];
  page.drawText("TOTALS", { x, y, size: 7.5, font: fonts.bold, color: GOLD });
  page.drawLine({ start: { x: x + 38, y: y + 2 }, end: { x: x + width, y: y + 2 }, thickness: .6, color: LINE });
  let rowY = y - 21;
  rows.forEach(([label, value, emphasis]) => {
    if (emphasis) page.drawRectangle({ x, y: rowY - 9, width, height: 27, color: BLACK });
    page.drawText(label, { x: x + 11, y: rowY, size: emphasis ? 9.5 : 8, font: fonts.bold, color: emphasis ? WHITE : MID });
    rightText(page, fonts, `${value < 0 ? "-" : ""}${money(Math.abs(value))}`, x + width - 11, rowY, emphasis ? 10.5 : 8.3, emphasis ? GOLD : DARK, true);
    rowY -= emphasis ? 34 : 20;
  });
}

function minimumTotalsStart(order: Order): number {
  const optionalRows = Number(Boolean(order.totals.discount)) * 2
    + Number(Boolean(order.totals.shipping))
    + Number(Boolean(order.totals.tax));
  const nonTotalRows = 1 + optionalRows;
  return 105 + nonTotalRows * 20;
}

function drawFooter(page: PDFPage, order: Order, fonts: Fonts, number: number, total: number): void {
  page.drawLine({ start: { x: MARGIN, y: 39 }, end: { x: PAGE_WIDTH - MARGIN, y: 39 }, thickness: .5, color: LINE });
  page.drawText("BLACKMARKETLABS.COM", { x: MARGIN, y: 25, size: 6.5, font: fonts.bold, color: MID });
  rightText(page, fonts, `${order.id}  PAGE ${number} OF ${total}`, PAGE_WIDTH - MARGIN, 25, 6.5, MID);
}

async function loadThumbnail(pdf: PDFDocument, line: OrderLine, cache: Map<string, PDFImage | null>): Promise<PDFImage | null> {
  const source = String(line.image || "").trim();
  const key = `${line.variantId || ""}|${line.item || ""}|${source}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (/^https:\/\//i.test(source) && isTrustedCatalogImageSource(source)) {
    const remote = await remoteThumbnail(source).catch(() => null);
    if (remote) {
      const embedded = await pdf.embedJpg(Uint8Array.from(remote)).catch(() => null);
      if (embedded) {
        cache.set(key, embedded);
        return embedded;
      }
    }
  }
  const bundled = bundledPdfProductThumbnail(line);
  if (bundled) {
    const embedded = await pdf.embedJpg(bundled);
    cache.set(key, embedded);
    return embedded;
  }
  try {
    const jpeg = source.startsWith("/") && isTrustedCatalogImageSource(source)
      ? await localThumbnail(source).catch(() => null)
      : null;
    if (!jpeg) {
      cache.set(key, null);
      return null;
    }
    const embedded = await pdf.embedJpg(Uint8Array.from(jpeg));
    cache.set(key, embedded);
    return embedded;
  } catch {
    cache.set(key, null);
    return null;
  }
}

async function localThumbnail(source: string): Promise<Buffer> {
  const pathname = decodeURIComponent(new URL(source, "http://local").pathname);
  const publicRoot = path.resolve(process.cwd(), "public");
  const local = path.resolve(publicRoot, pathname.replace(/^\/+/, ""));
  if (!local.startsWith(`${publicRoot}${path.sep}`)) throw new Error("Invalid image path");
  return makeThumbnail(await readFile(local));
}

async function remoteThumbnail(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "force-cache" });
  if (!response.ok) throw new Error("Image unavailable");
  if (!String(response.headers.get("content-type") || "").toLowerCase().startsWith("image/")) throw new Error("Unexpected media type");
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > 8 * 1024 * 1024) throw new Error("Image is too large");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Image is too large");
  return makeThumbnail(bytes);
}

async function makeThumbnail(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(104, 104, { fit: "contain", background: "#f5f5f3" })
    .flatten({ background: "#f5f5f3" })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();
}

function drawCenteredWordmark(page: PDFPage, fonts: Fonts, y: number, size: number, brandColor: ReturnType<typeof rgb>): void {
  const brand = "BLACKMARKET";
  const suffix = "WHOLESALE";
  const suffixSize = size * .39;
  const gap = 7;
  const total = fonts.bold.widthOfTextAtSize(brand, size) + gap + fonts.bold.widthOfTextAtSize(suffix, suffixSize);
  const x = (PAGE_WIDTH - total) / 2;
  page.drawText(brand, { x, y, size, font: fonts.bold, color: brandColor });
  page.drawText(suffix, { x: x + fonts.bold.widthOfTextAtSize(brand, size) + gap, y: y + 1, size: suffixSize, font: fonts.bold, color: GOLD });
}

function centeredText(page: PDFPage, fonts: Fonts, text: string, center: number, y: number, size: number, color: ReturnType<typeof rgb>, bold = false): void {
  const font = bold ? fonts.bold : fonts.regular;
  const safe = safeText(text);
  page.drawText(safe, { x: center - font.widthOfTextAtSize(safe, size) / 2, y, size, font, color });
}

function rightText(page: PDFPage, fonts: Fonts, text: string, x: number, y: number, size: number, color: ReturnType<typeof rgb>, bold = false): void {
  const font = bold ? fonts.bold : fonts.regular;
  const safe = safeText(text);
  page.drawText(safe, { x: x - font.widthOfTextAtSize(safe, size), y, size, font, color });
}

function wrap(text: string, font: PDFFont, size: number, width: number, maximum: number): string[] {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && current) {
      lines.push(current);
      current = word;
      if (lines.length === maximum - 1) break;
    } else current = next;
  }
  if (current && lines.length < maximum) lines.push(current);
  return lines.length ? lines : [""];
}

function shippingLabel(order: Order): string {
  const store = order.store;
  return [store.street, [store.city, store.state, store.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "-";
}

function unitPrice(line: OrderLine): number {
  const parsed = Number(String(line.wholesale || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number(line.lineWholesale || 0) / Math.max(1, Number(line.qty || 1));
}

function money(value: number): string { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0)); }
function dateLabel(value: string): string { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"; }
function safeText(value: unknown): string { return String(value ?? "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim(); }
