import type { Metadata } from "next";
import "./globals.css";

import { MobileBottomNavigation } from "@/components/navigation/mobile-bottom-navigation";

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
        {children}
        <MobileBottomNavigation />
      </body>
    </html>
  );
}
