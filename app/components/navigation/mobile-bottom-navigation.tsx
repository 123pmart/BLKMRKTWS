"use client";

import { ArrowLeft, Home, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { goHome, initializePortalHistory, recordPortalNavigation, safePortalBack, signInBackGoesHome } from "@/lib/navigation/internal-history";

const OVERLAY_CLASSES = ["cart-open", "modal-open", "nav-open", "admin-news-editing", "admin-product-editing"];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const lastScrollY = useRef(0);
  const directionAnchorY = useRef(0);
  const lastDirection = useRef<"up" | "down" | null>(null);
  const hiddenRef = useRef(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    initializePortalHistory();
  }, [pathname]);

  useEffect(() => {
    const initialY = Math.max(0, window.scrollY);
    lastScrollY.current = initialY;
    directionAnchorY.current = initialY;
    const updateHidden = (next: boolean) => {
      if (hiddenRef.current === next) return;
      hiddenRef.current = next;
      setHiddenByScroll(next);
    };
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - lastScrollY.current;
        const shortPage = document.documentElement.scrollHeight <= window.innerHeight + 8;
        if (currentY <= 14 || shortPage) {
          updateHidden(false);
          lastScrollY.current = currentY;
          directionAnchorY.current = currentY;
          lastDirection.current = null;
          return;
        }
        if (Math.abs(delta) < 2) return;
        const direction = delta > 0 ? "down" : "up";
        if (direction !== lastDirection.current) {
          lastDirection.current = direction;
          directionAnchorY.current = lastScrollY.current;
        }
        lastScrollY.current = currentY;
        if (Math.abs(currentY - directionAnchorY.current) < 30) return;
        updateHidden(direction === "down");
        directionAnchorY.current = currentY;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    const syncOverlayState = () => {
      const classOverlay = OVERLAY_CLASSES.some((name) => document.body.classList.contains(name));
      const dialogOverlay = Boolean(document.querySelector("dialog[open], [aria-modal='true']:not([aria-hidden='true'])"));
      setOverlayOpen(classOverlay || dialogOverlay);
    };
    syncOverlayState();
    const observer = new MutationObserver(syncOverlayState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
    return () => observer.disconnect();
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
      data-hidden={hiddenByScroll || overlayOpen ? "true" : "false"}
      aria-label="Mobile portal navigation"
      aria-hidden={overlayOpen}
    >
      <span className="liquid-mobile-nav__refraction" aria-hidden="true" />
      <button className="liquid-mobile-nav__control" type="button" onClick={goBack} aria-label="Go back" title="Back">
        <ArrowLeft aria-hidden="true" />
      </button>
      <button
        className="liquid-mobile-nav__control"
        data-active={pathname === "/" || pathname.startsWith("/products") ? "true" : "false"}
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
