"use client";

import { ArrowLeft, Home } from "lucide-react";
import type { ReactNode } from "react";

import { goHome, PORTAL_HOME_PATH } from "@/lib/navigation/internal-history";

export function PortalHomeLink({ children = "Products", back = false, replace = false, showIcon = true, className = "" }: {
  children?: ReactNode;
  back?: boolean;
  replace?: boolean;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <a
      href={PORTAL_HOME_PATH}
      className={className}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        goHome({ replace });
      }}
    >
      {showIcon ? back ? <ArrowLeft aria-hidden="true" /> : <Home aria-hidden="true" /> : null}
      <span>{children}</span>
    </a>
  );
}
