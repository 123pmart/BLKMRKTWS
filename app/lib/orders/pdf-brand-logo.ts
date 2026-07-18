import "server-only";

import logoData from "@/lib/orders/pdf-brand-logo.json";

interface PdfBrandLogoData {
  version: number;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  data: string;
}

const logo = logoData as PdfBrandLogoData;

export function bundledPdfBrandLogo(): string {
  return `data:${logo.mimeType};base64,${logo.data}`;
}
