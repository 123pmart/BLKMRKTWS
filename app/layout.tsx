import type { Metadata } from "next";
import "./globals.css";

import { MobileBottomNavigation } from "@/components/navigation/mobile-bottom-navigation";
import { PortalClientRoot } from "@/components/portal/portal-client-root";

export const metadata: Metadata = {
  title: "BLACKMARKET Wholesale",
  description: "BLACKMARKET wholesale ordering portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PortalClientRoot>
          {children}
          <MobileBottomNavigation />
        </PortalClientRoot>
      </body>
    </html>
  );
}
