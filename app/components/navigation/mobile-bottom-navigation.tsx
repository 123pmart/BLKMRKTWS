"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { goHome, initializePortalHistory, recordPortalNavigation, safePortalBack, signInBackGoesHome } from "@/lib/navigation/internal-history";

const OVERLAY_CLASSES = ["cart-open", "modal-open", "nav-open", "admin-news-editing", "admin-product-editing"];

export function MobileBottomNavigation({ maintenanceMode = false }: { maintenanceMode?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [accountDestination, setAccountDestination] = useState("/sign-in");
  const [cartUnits, setCartUnits] = useState(0);

  useEffect(() => {
    initializePortalHistory();
    fetch("/api/account/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setAccountDestination(result.authenticated ? "/account" : "/sign-in"))
      .catch(() => undefined);
    const syncCart = () => setCartUnits(readLegacyCartUnits());
    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("blackmarket:cart-updated", syncCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("blackmarket:cart-updated", syncCart);
    };
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
      data-maintenance={maintenanceMode ? "true" : "false"}
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
      {!maintenanceMode ? (
        <button
          className="liquid-mobile-nav__control"
          data-active={pathname.startsWith("/account") || pathname === "/sign-in" ? "true" : "false"}
          type="button"
          onClick={() => { if (pathname !== accountDestination) navigate(accountDestination); }}
          aria-label="Account"
          aria-current={pathname.startsWith("/account") || pathname === "/sign-in" ? "page" : undefined}
          title="Account"
        >
          <NavGlyph name="account" />
        </button>
      ) : null}
      {!maintenanceMode ? (
        <button
          className="liquid-mobile-nav__control"
          data-active={pathname === "/cart" ? "true" : "false"}
          type="button"
          onClick={() => navigate("/cart")}
          aria-label={`Cart, ${cartUnits} item${cartUnits === 1 ? "" : "s"}`}
          aria-current={pathname === "/cart" ? "page" : undefined}
          title="Cart"
        >
          <NavGlyph name="cart" />
          {cartUnits ? <span className="liquid-mobile-nav__badge">{cartUnits > 99 ? "99+" : cartUnits}</span> : null}
        </button>
      ) : null}
    </nav>
  );
}

function NavGlyph({ name }: { name: "back" | "home" | "account" | "cart" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "back" ? <path d="m15 18-6-6 6-6" /> : null}
      {name === "home" ? <><path d="m4.5 11.5 7.5-6 7.5 6" /><path d="M6.5 10.5V19h11v-8.5" /></> : null}
      {name === "account" ? <><circle cx="12" cy="8.5" r="3" /><path d="M6.5 19c.6-3.3 2.4-4.9 5.5-4.9s4.9 1.6 5.5 4.9" /></> : null}
      {name === "cart" ? <><path d="M6 6h14l-2 8H8L6 3H3" /><circle cx="9" cy="19" r="1.25" /><circle cx="17" cy="19" r="1.25" /></> : null}
    </svg>
  );
}

function readLegacyCartUnits(): number {
  try {
    const cart = JSON.parse(window.localStorage.getItem("blackmarket-wholesale-cart-v4") || "{}") as Record<string, unknown>;
    return Object.values(cart).reduce<number>((total, value) => total + Math.max(0, Math.floor(Number(value) || 0)), 0);
  } catch {
    return 0;
  }
}
