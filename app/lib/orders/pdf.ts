import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";

import { isTrustedCatalogImageSource } from "@/lib/catalog/image-core";
import type { Order, OrderLine } from "@/types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 38;
const GOLD = rgb(0.965, 0.851, 0);
const BLACK = rgb(0.025, 0.025, 0.03);
const DARK = rgb(0.11, 0.11, 0.12);
const MID = rgb(0.42, 0.42, 0.45);
const LIGHT = rgb(0.94, 0.94, 0.93);
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
  let y = drawDocumentHeader(page, order, fonts);
  y = drawStoreBlock(page, order, fonts, y);
  y = drawTableHeader(page, fonts, y - 18);

  for (const line of order.lines) {
    const titleLines = wrap(`${line.product || "Product"}`, fonts.bold, 10, 214, 2);
    const flavorLines = wrap(`${line.flavor || ""}`, fonts.regular, 8.5, 214, 2);
    const rowHeight = Math.max(66, 30 + (titleLines.length + flavorLines.length) * 10);
    if (y - rowHeight < 142) {
      page = addPage(pdf);
      pages.push(page);
      y = drawContinuationHeader(page, order, fonts);
      y = drawTableHeader(page, fonts, y);
    }
    const image = await loadThumbnail(pdf, line.image, thumbnails);
    drawLineRow(page, line, image, fonts, y, rowHeight, titleLines, flavorLines);
    y -= rowHeight;
  }

  if (y < 180) {
    page = addPage(pdf);
    pages.push(page);
    y = drawContinuationHeader(page, order, fonts);
  }
  drawTotals(page, order, fonts, y - 18);

  pages.forEach((current, index) => drawFooter(current, order, fonts, index + 1, pages.length));
  return pdf.save({ useObjectStreams: true });
}

function addPage(pdf: PDFDocument): PDFPage {
  return pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function drawDocumentHeader(page: PDFPage, order: Order, fonts: Fonts): number {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 124, width: PAGE_WIDTH, height: 124, color: BLACK });
  drawWholesaleWordmark(page, fonts, MARGIN, PAGE_HEIGHT - 43, 19);
  page.drawText("WHOLESALE ORDER", { x: MARGIN, y: PAGE_HEIGHT - 92, size: 20, font: fonts.bold, color: WHITE });
  page.drawText("CONFIRMATION", { x: MARGIN, y: PAGE_HEIGHT - 109, size: 11, font: fonts.bold, color: GOLD });

  const metaX = 383;
  labelValue(page, fonts, metaX, PAGE_HEIGHT - 40, "ORDER NUMBER", order.id, true);
  labelValue(page, fonts, metaX, PAGE_HEIGHT - 71, "ORDER DATE", dateLabel(order.date), true);
  labelValue(page, fonts, metaX, PAGE_HEIGHT - 102, "STATUS", String(order.status || "Received").toUpperCase(), true);
  return PAGE_HEIGHT - 144;
}

function drawContinuationHeader(page: PDFPage, order: Order, fonts: Fonts): number {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 70, width: PAGE_WIDTH, height: 70, color: BLACK });
  drawWholesaleWordmark(page, fonts, MARGIN, PAGE_HEIGHT - 34, 16);
  page.drawText("ORDER CONFIRMATION", { x: MARGIN, y: PAGE_HEIGHT - 50, size: 8, font: fonts.bold, color: GOLD });
  rightText(page, fonts, order.id, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 40, 9, WHITE, true);
  return PAGE_HEIGHT - 92;
}

function drawStoreBlock(page: PDFPage, order: Order, fonts: Fonts, y: number): number {
  const store = order.store;
  page.drawRectangle({ x: MARGIN, y: y - 93, width: PAGE_WIDTH - MARGIN * 2, height: 93, color: LIGHT, borderColor: rgb(.84, .84, .83), borderWidth: .6 });
  page.drawText("SHIP TO", { x: MARGIN + 14, y: y - 18, size: 7.5, font: fonts.bold, color: MID });
  page.drawText(store.storeName || "Store", { x: MARGIN + 14, y: y - 37, size: 13, font: fonts.bold, color: BLACK });
  const address = [store.street, [store.city, store.state, store.zip].filter(Boolean).join(" ")].filter(Boolean);
  address.forEach((line, index) => page.drawText(safeText(line), { x: MARGIN + 14, y: y - 53 - index * 12, size: 8.5, font: fonts.regular, color: DARK }));

  const contactX = 326;
  page.drawText("STORE CONTACT", { x: contactX, y: y - 18, size: 7.5, font: fonts.bold, color: MID });
  [store.contactName, store.email, store.phone].filter(Boolean).forEach((line, index) => {
    page.drawText(safeText(line), { x: contactX, y: y - 37 - index * 13, size: index === 0 ? 9.5 : 8.5, font: index === 0 ? fonts.bold : fonts.regular, color: DARK });
  });
  return y - 93;
}

function drawTableHeader(page: PDFPage, fonts: Fonts, y: number): number {
  page.drawRectangle({ x: MARGIN, y: y - 25, width: PAGE_WIDTH - MARGIN * 2, height: 25, color: DARK });
  page.drawText("ITEM", { x: MARGIN + 10, y: y - 17, size: 7.5, font: fonts.bold, color: WHITE });
  page.drawText("PRODUCT / FLAVOR", { x: MARGIN + 75, y: y - 17, size: 7.5, font: fonts.bold, color: WHITE });
  rightText(page, fonts, "QTY", 432, y - 17, 7.5, WHITE);
  rightText(page, fonts, "UNIT", 495, y - 17, 7.5, WHITE);
  rightText(page, fonts, "TOTAL", PAGE_WIDTH - MARGIN - 9, y - 17, 7.5, WHITE);
  return y - 25;
}

function drawLineRow(page: PDFPage, line: OrderLine, image: PDFImage | null, fonts: Fonts, y: number, height: number, titleLines: string[], flavorLines: string[]): void {
  page.drawRectangle({ x: MARGIN, y: y - height, width: PAGE_WIDTH - MARGIN * 2, height, color: WHITE, borderColor: rgb(.88, .88, .87), borderWidth: .5 });
  if (image) page.drawImage(image, { x: MARGIN + 8, y: y - height + 7, width: 52, height: 52 });
  else {
    page.drawRectangle({ x: MARGIN + 8, y: y - height + 7, width: 52, height: 52, color: LIGHT });
    page.drawText("BLACKMARKET", { x: MARGIN + 12, y: y - height + 31, size: 5.1, font: fonts.bold, color: DARK });
    page.drawText("WHOLESALE", { x: MARGIN + 17, y: y - height + 23, size: 3.8, font: fonts.bold, color: rgb(.56, .49, 0) });
  }
  let textY = y - 17;
  titleLines.forEach((lineText) => { page.drawText(safeText(lineText), { x: MARGIN + 75, y: textY, size: 10, font: fonts.bold, color: BLACK }); textY -= 11; });
  flavorLines.forEach((lineText) => { page.drawText(safeText(lineText), { x: MARGIN + 75, y: textY, size: 8.5, font: fonts.regular, color: MID }); textY -= 10; });
  page.drawText(`SKU ${safeText(line.item || "—")}`, { x: MARGIN + 75, y: y - height + 11, size: 7.5, font: fonts.regular, color: MID });
  const baseline = y - height / 2 - 3;
  rightText(page, fonts, String(line.qty), 432, baseline, 9, DARK);
  rightText(page, fonts, money(unitPrice(line)), 495, baseline, 9, DARK);
  rightText(page, fonts, money(line.lineWholesale), PAGE_WIDTH - MARGIN - 9, baseline, 9.5, BLACK, true);
}

function drawTotals(page: PDFPage, order: Order, fonts: Fonts, y: number): void {
  const totals = order.totals;
  const width = 242;
  const x = PAGE_WIDTH - MARGIN - width;
  const rows: Array<[string, number, boolean]> = [
    ["Subtotal", totals.subtotal ?? totals.wholesale, false],
    ...(totals.discount ? [["Account savings", -totals.discount, false] as [string, number, boolean]] : []),
    ...(totals.shipping ? [["Shipping", totals.shipping, false] as [string, number, boolean]] : []),
    ...(totals.tax ? [["Tax", totals.tax, false] as [string, number, boolean]] : []),
    ["TOTAL", totals.grandTotal ?? totals.wholesale, true],
  ];
  page.drawText("ORDER SUMMARY", { x, y, size: 8, font: fonts.bold, color: MID });
  let rowY = y - 22;
  rows.forEach(([label, value, emphasis]) => {
    if (emphasis) page.drawRectangle({ x, y: rowY - 10, width, height: 28, color: BLACK });
    page.drawText(label, { x: x + 12, y: rowY, size: emphasis ? 10 : 8.5, font: fonts.bold, color: emphasis ? WHITE : DARK });
    rightText(page, fonts, `${value < 0 ? "-" : ""}${money(Math.abs(value))}`, x + width - 12, rowY, emphasis ? 11 : 8.5, emphasis ? GOLD : DARK, emphasis);
    rowY -= emphasis ? 36 : 22;
  });
  page.drawText("Prices and quantities shown are those recorded with this order.", { x: MARGIN, y: Math.max(75, rowY), size: 7.5, font: fonts.regular, color: MID });
}

function drawFooter(page: PDFPage, order: Order, fonts: Fonts, number: number, total: number): void {
  page.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: .6, color: rgb(.82, .82, .81) });
  page.drawText("BLACKMARKETLABS.COM", { x: MARGIN, y: 27, size: 7, font: fonts.bold, color: MID });
  rightText(page, fonts, `${order.id}  ·  PAGE ${number} OF ${total}`, PAGE_WIDTH - MARGIN, 27, 7, MID);
}

async function loadThumbnail(pdf: PDFDocument, source: string | undefined, cache: Map<string, PDFImage | null>): Promise<PDFImage | null> {
  if (!source || !isTrustedCatalogImageSource(source)) return null;
  if (cache.has(source)) return cache.get(source) ?? null;
  try {
    let original: Buffer;
    if (source.startsWith("/")) {
      const local = path.resolve(process.cwd(), "public", source.replace(/^\/+/, ""));
      const publicRoot = path.resolve(process.cwd(), "public");
      if (!local.startsWith(`${publicRoot}${path.sep}`)) throw new Error("Invalid image path");
      original = await readFile(local);
    } else if (/^https:\/\//i.test(source)) {
      const response = await fetch(source, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error("Image unavailable");
      if (!String(response.headers.get("content-type") || "").toLowerCase().startsWith("image/")) throw new Error("Unexpected media type");
      const declaredSize = Number(response.headers.get("content-length") || 0);
      if (declaredSize > 8 * 1024 * 1024) throw new Error("Image is too large");
      original = Buffer.from(await response.arrayBuffer());
    } else return null;
    if (original.byteLength > 8 * 1024 * 1024) throw new Error("Image is too large");
    const thumbnail = await sharp(original).resize(112, 112, { fit: "contain", background: "#f3f3f1" }).flatten({ background: "#f3f3f1" }).jpeg({ quality: 68, mozjpeg: true }).toBuffer();
    const embedded = await pdf.embedJpg(thumbnail);
    cache.set(source, embedded);
    return embedded;
  } catch {
    cache.set(source, null);
    return null;
  }
}

function drawWholesaleWordmark(page: PDFPage, fonts: Fonts, x: number, y: number, size: number): void {
  const brand = "BLACKMARKET";
  page.drawText(brand, { x, y, size, font: fonts.bold, color: WHITE });
  const wholesaleX = x + fonts.bold.widthOfTextAtSize(brand, size) + 7;
  page.drawText("WHOLESALE", { x: wholesaleX, y: y + 1, size: size * .43, font: fonts.bold, color: GOLD });
}

function labelValue(page: PDFPage, fonts: Fonts, x: number, y: number, label: string, value: string, right = false): void {
  const end = PAGE_WIDTH - MARGIN;
  const targetX = right ? end : x;
  if (right) {
    rightText(page, fonts, label, targetX, y, 6.5, MID, true);
    rightText(page, fonts, safeText(value), targetX, y - 12, 8.5, WHITE, true);
  }
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

function unitPrice(line: OrderLine): number {
  const parsed = Number(String(line.wholesale || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number(line.lineWholesale || 0) / Math.max(1, Number(line.qty || 1));
}
function money(value: number): string { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0)); }
function dateLabel(value: string): string { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"; }
function safeText(value: unknown): string { return String(value ?? "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim(); }
