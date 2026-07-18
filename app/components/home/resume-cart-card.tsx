"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";

export function ResumeCartCard() {
  const { units, ready } = useCart();
  if (!ready || !units) return null;
  return <Link href="/cart" className="home-action-card"><span>Current cart</span><strong>Resume {units} unit{units === 1 ? "" : "s"}</strong><small>Continue checkout →</small></Link>;
}
