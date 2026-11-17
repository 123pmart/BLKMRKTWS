import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import nextConfig from "../next.config.mjs";

let conversionAttempts = 0;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    if (specifier === "sharp") {
      conversionAttempts += 1;
      return { url: 'data:text/javascript,throw new Error("Simulated missing native image library")', shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      const relative = specifier.slice(2);
      const extension = relative.endsWith(".json") ? "" : ".ts";
      return { url: new URL(`../app/${relative}${extension}`, import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json") && url.includes("/app/lib/orders/")) {
      return { format: "module", source: `export default ${readFileSync(new URL(url), "utf8")}`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { generateOrderConfirmationPdf } = await import("../app/lib/orders/pdf.ts");
const embeddedWebp = "data:image/webp;base64,UklGRgwAAABXRUJQVlA4IAAAAAA=";
const order = {
  id: "pdf-regression-test",
  date: "2026-11-17T18:00:00Z",
  status: "received",
  store: { storeName: "Sample Store", contactName: "Sample Buyer", email: "", phone: "", street: "", city: "", state: "", zip: "" },
  lines: [{
    variantId: "defy-hyper-stimulant-streettarts-56329",
    item: "56329", product: "DEFY", flavor: "Streettarts", image: embeddedWebp,
    qty: 2, wholesale: "$28.00", map: "$59.99", lineWholesale: 56, lineMap: 119.98,
  }],
  totals: { units: 2, wholesale: 56, map: 119.98 },
};

test("PDF generation survives native converter failure and keeps bundled bottle images", async () => {
  const bytes = await generateOrderConfirmationPdf(order);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  const images = pdf.getPage(0).node.Resources().lookup(PDFName.of("XObject"), PDFDict);
  assert.equal(images.keys().length, 2, "brand logo and bundled product image");
  assert.ok(conversionAttempts > 0, "exercise the unavailable conversion library");
});

test("custom products still download when their image cannot be converted", async () => {
  const custom = { ...order, lines: [{ ...order.lines[0], variantId: "custom-variant", item: "CUSTOM" }] };
  const pdf = await PDFDocument.load(await generateOrderConfirmationPdf(custom));
  assert.equal(pdf.getPageCount(), 1);
});

test("both PDF endpoints explicitly package the native image dependencies", () => {
  for (const route of ["/api/order-pdf", "/api/account/orders/*/pdf"]) {
    assert.ok(nextConfig.outputFileTracingIncludes[route].includes("./node_modules/@img/**/*"));
  }
});
