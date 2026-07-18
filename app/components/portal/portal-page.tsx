import type { ReactNode } from "react";

import { PortalHeader } from "@/components/portal/portal-header";

export function PortalPage({ children, authenticated = false, className = "" }: { children: ReactNode; authenticated?: boolean; className?: string }) {
  return <div className={`portal-react ${className}`.trim()}><PortalHeader authenticated={authenticated} /><main className="portal-main">{children}</main></div>;
}
