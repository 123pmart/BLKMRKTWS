import type { Metadata } from "next";
import "./globals.css";

import { MobileBottomNavigation } from "@/components/navigation/mobile-bottom-navigation";
import { getAssistantAvailability } from "@/lib/assistant/availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BLACKMARKET Wholesale",
  description: "BLACKMARKET wholesale ordering portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const availability = await getAssistantAvailability();
  return (
    <html lang="en">
      <body>
        {children}
        <MobileBottomNavigation
          assistantEnabled={availability.enabled}
          maintenanceMode={availability.maintenanceMode}
        />
      </body>
    </html>
  );
}
