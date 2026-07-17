"use client";

import { ArrowLeft, Home, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { initializePortalHistory, recordPortalNavigation, safePortalBack } from "@/lib/navigation/internal-history";

const OVERLAY_CLASSES = ["cart-open", "modal-open", "nav-open", "admin-news-editing", "admin-product-editing"];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const lastScrollY = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    initializePortalHistory();
  }, [pathname]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let touchY: number | null = null;
    const applyDirection = (delta: number) => {
      if (Math.abs(delta) < 12 || window.scrollY <= 18) return;
      setHiddenByScroll(delta > 0);
    };
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - lastScrollY.current;
        if (currentY <= 18 || document.documentElement.scrollHeight <= window.innerHeight + 8) {
          setHiddenByScroll(false);
          lastScrollY.current = currentY;
        } else if (Math.abs(delta) >= 12) {
          setHiddenByScroll(delta > 0);
          lastScrollY.current = currentY;
        }
      });
    };
    const onWheel = (event: WheelEvent) => applyDirection(event.deltaY);
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null; };
    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (touchY === null || currentY === undefined) return;
      applyDirection(touchY - currentY);
      if (Math.abs(touchY - currentY) >= 12) touchY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
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
    safePortalBack(() => router.replace("/products"));
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
        onClick={() => navigate("/products")}
        aria-label="Home"
        title="Home"
      >
        <Home aria-hidden="true" />
      </button>
      <button
        className="liquid-mobile-nav__control"
        data-active={pathname.startsWith("/account") || pathname === "/sign-in" ? "true" : "false"}
        type="button"
        onClick={() => navigate("/account")}
        aria-label="Account"
        title="Account"
      >
        <UserRound aria-hidden="true" />
      </button>
    </nav>
  );
}
