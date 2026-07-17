"use client";

import { ArrowLeft, Home, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { goHome, initializePortalHistory, recordPortalNavigation, safePortalBack, signInBackGoesHome } from "@/lib/navigation/internal-history";

const OVERLAY_CLASSES = ["cart-open", "modal-open", "nav-open", "admin-news-editing", "admin-product-editing"];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    initializePortalHistory();
  }, [pathname]);

  useEffect(() => {
    const syncOverlayState = () => {
      const classOverlay = OVERLAY_CLASSES.some((name) => document.body.classList.contains(name));
      const dialogOverlay = Boolean(document.querySelector("dialog[open], [aria-modal='true']:not([aria-hidden='true'])"));
      const next = classOverlay || dialogOverlay;
      setOverlayOpen((current) => current === next ? current : next);
    };
    syncOverlayState();
    const observer = new MutationObserver(syncOverlayState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("toggle", syncOverlayState, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("toggle", syncOverlayState, true);
    };
  }, []);

  if (pathname.startsWith("/admin")) return null;

  function goBack() {
    if (signInBackGoesHome(pathname)) {
      goHome({ replace: true });
      return;
    }
    safePortalBack(() => goHome({ replace: true }));
  }

  function navigate(path: string) {
    recordPortalNavigation(path);
    router.push(path);
  }

  return (
    <nav
      className="liquid-mobile-nav"
      data-hidden={overlayOpen ? "true" : "false"}
      aria-label="Mobile portal navigation"
      aria-hidden={overlayOpen}
    >
      <span className="liquid-mobile-nav__refraction" aria-hidden="true" />
      <button className="liquid-mobile-nav__control" type="button" onClick={goBack} aria-label="Go back" title="Back">
        <ArrowLeft aria-hidden="true" />
      </button>
      <button
        className="liquid-mobile-nav__control"
        data-active={pathname === "/" ? "true" : "false"}
        type="button"
        onClick={() => goHome()}
        aria-label="Home"
        title="Home"
      >
        <Home aria-hidden="true" />
      </button>
      <button
        className="liquid-mobile-nav__control"
        data-active={pathname.startsWith("/account") || pathname === "/sign-in" ? "true" : "false"}
        type="button"
        onClick={() => { if (pathname !== "/sign-in") navigate("/account"); }}
        aria-label="Account"
        aria-current={pathname.startsWith("/account") || pathname === "/sign-in" ? "page" : undefined}
        title="Account"
      >
        <UserRound aria-hidden="true" />
      </button>
    </nav>
  );
}
