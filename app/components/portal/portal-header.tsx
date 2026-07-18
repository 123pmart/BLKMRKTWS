"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/components/cart/cart-provider";
import { WholesaleWordmark } from "@/components/branding/wholesale-wordmark";
import { trackPortalEvent } from "@/lib/analytics/client";

export function PortalHeader({ authenticated = false }: { authenticated?: boolean }) {
  const pathname = usePathname();
  const { units } = useCart();
  return (
    <header className="portal-header">
      <Link href="/" className="portal-header__brand" aria-label="BLACKMARKET Wholesale home"><WholesaleWordmark compact /></Link>
      <nav className="portal-header__nav" aria-label="Primary navigation">
        <Link data-active={pathname.startsWith("/products")} href="/products">Products</Link>
        <Link data-active={pathname === "/news"} href="/news">News</Link>
        <Link data-active={pathname === "/catalog"} href="/catalog">Catalog</Link>
      </nav>
      <div className="portal-header__actions">
        <Link href={authenticated ? "/account" : "/sign-in"} aria-label={authenticated ? "Account" : "Sign in"} className="portal-header__account">{authenticated ? "Account" : "Sign in"}</Link>
        <Link href="/cart" onClick={() => trackPortalEvent("cart_opened", { units })} className="portal-header__cart" aria-label={`Cart, ${units} item${units === 1 ? "" : "s"}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
          <span>{units}</span>
        </Link>
      </div>
    </header>
  );
}
