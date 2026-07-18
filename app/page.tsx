/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { ResumeCartCard } from "@/components/home/resume-cart-card";
import { PortalPage } from "@/components/portal/portal-page";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { loadPublicCatalog } from "@/lib/catalog/server-catalog";
import { loadPublicAnnouncements } from "@/lib/content/public-content";
import { frequentlyOrderedItems } from "@/lib/orders/frequently-ordered";
import { getOrdersForVerifiedStore } from "@/lib/orders/store-order-history";

const CATEGORY_CARDS = [
  { slug: "thermogenics", label: "Thermogenics", image: "/assets/landing/cuts.webp" },
  { slug: "focus", label: "High Stim & Nootropics", image: "/assets/landing/defy.webp" },
  { slug: "pump", label: "Pump", image: "/assets/landing/pump.webp" },
  { slug: "strength", label: "Strength", image: "/assets/landing/bulk.webp" },
  { slug: "raws", label: "Raws", image: "/assets/landing/creatine.webp" },
  { slug: "all", label: "All products", image: "/assets/landing/rule.webp" },
];

export default async function HomePage() {
  const verified = await getVerifiedStoreAccount();
  const [catalog, announcements] = await Promise.all([loadPublicCatalog(verified?.account), loadPublicAnnouncements()]);
  const orders = verified ? await getOrdersForVerifiedStore(verified.identity) : [];
  const frequent = frequentlyOrderedItems(orders, catalog.items);
  const latestOrder = orders[0]; const latest = announcements[0];
  return <PortalPage authenticated={Boolean(verified)} className="home-page">
    <section className="home-hero"><div><p className="portal-kicker">BLACKMARKET Wholesale</p><h1>{verified ? `Welcome back, ${verified.account.store.contactName || verified.account.store.storeName}.` : "Wholesale ordering, built for speed."}</h1><p>{verified ? "Your current store pricing is already applied. Resume a cart, repeat an order, or jump into a category." : "Browse the live catalog, request store access, and build an order with current wholesale and MAP pricing."}</p><div className="home-hero__actions"><Link href="/products">Browse products</Link>{verified ? <Link href="/account/orders">Order history</Link> : <Link href="/sign-in">Sign in / request access</Link>}</div></div>{latest ? <Link href="/news" className="home-update"><span>{latest.label || "Update"} · {latest.date}</span><strong>{latest.title}</strong><small>{latest.body}</small></Link> : null}</section>
    {verified ? <section className="home-actions" aria-label="Account shortcuts"><ResumeCartCard />{latestOrder ? <Link href={`/account/orders/${encodeURIComponent(latestOrder.id)}`} className="home-action-card"><span>Latest order</span><strong>Reorder {new Date(latestOrder.date).toLocaleDateString()}</strong><small>Review current availability →</small></Link> : null}<Link href="/account" className="home-action-card"><span>Account pricing</span><strong>Verified store account</strong><small>Profile and order history →</small></Link></section> : null}
    <section className="home-categories" aria-labelledby="category-heading"><div className="section-heading"><p className="portal-kicker">Start an order</p><h2 id="category-heading">Shop by category</h2></div><div className="home-category-grid">{CATEGORY_CARDS.map((card) => <Link key={card.slug} href={`/products${card.slug === "all" ? "" : `?category=${card.slug}`}`} className="home-category-card"><img src={card.image} alt="" width="420" height="420" loading={card.slug === "thermogenics" ? "eager" : "lazy"} decoding="async" /><strong>{card.label}</strong></Link>)}</div></section>
    {frequent.length ? <section className="home-frequent" aria-labelledby="frequent-heading"><div className="section-heading"><p className="portal-kicker">Based only on your order history</p><h2 id="frequent-heading">Frequently ordered</h2></div><div className="product-grid product-grid--compact">{frequent.map((item) => <ProductCard key={item.variantId} item={item} />)}</div></section> : null}
  </PortalPage>;
}
