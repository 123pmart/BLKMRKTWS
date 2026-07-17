"use client";

import { ArrowLeft, Home, LogIn, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PORTAL_ENTRY_KEY = "blackmarket-portal-entry-history-length";

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const accountRoute = pathname.startsWith("/account");

  useEffect(() => {
    if (!sessionStorage.getItem(PORTAL_ENTRY_KEY)) {
      sessionStorage.setItem(PORTAL_ENTRY_KEY, String(window.history.length));
    }
  }, []);

  function goBack() {
    const initialLength = Number(sessionStorage.getItem(PORTAL_ENTRY_KEY) || window.history.length);
    if (window.history.length > initialLength) {
      router.back();
      return;
    }
    router.replace("/products");
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-border bg-[#09090b]/95 px-3 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden" aria-label="Mobile portal navigation">
      <button className="flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-bold text-muted-foreground" type="button" onClick={goBack}>
        <ArrowLeft className="size-5" /> Back
      </button>
      {/* The catalog is a full-document compatibility route during migration. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-bold text-foreground" href="/products">
        <Home className="size-5" /> Home
      </a>
      <a className="flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-bold text-foreground" href={accountRoute ? "/account" : "/sign-in"}>
        {accountRoute ? <UserRound className="size-5" /> : <LogIn className="size-5" />}
        {accountRoute ? "Account" : "Sign In"}
      </a>
    </nav>
  );
}
