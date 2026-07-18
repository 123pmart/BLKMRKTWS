"use client";

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
        <NavGlyph name="back" />
      </button>
      <button
        className="liquid-mobile-nav__control"
        data-active={pathname === "/" ? "true" : "false"}
        type="button"
        onClick={() => goHome()}
        aria-label="Home"
        title="Home"
      >
        <NavGlyph name="home" />
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
        <NavGlyph name="account" />
      </button>
    </nav>
  );
}

function NavGlyph({ name }: { name: "back" | "home" | "account" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "back" ? <path d="m15 18-6-6 6-6" /> : null}
      {name === "home" ? <><path d="m4.5 11.5 7.5-6 7.5 6" /><path d="M6.5 10.5V19h11v-8.5" /></> : null}
      {name === "account" ? <><circle cx="12" cy="8.5" r="3" /><path d="M6.5 19c.6-3.3 2.4-4.9 5.5-4.9s4.9 1.6 5.5 4.9" /></> : null}
    </svg>
  );
}
