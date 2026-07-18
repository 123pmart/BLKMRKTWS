"use client";

import { useEffect, type ReactNode } from "react";

import { CartProvider } from "@/components/cart/cart-provider";

export function PortalClientRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/service-worker.js").catch(() => undefined);
    window.addEventListener("load", register, { once: true });
    if (document.readyState === "complete") register();
    return () => window.removeEventListener("load", register);
  }, []);
  return <CartProvider>{children}</CartProvider>;
}
