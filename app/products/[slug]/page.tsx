import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/catalog/product-detail";
import { PortalPage } from "@/components/portal/portal-page";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { loadPublicCatalog } from "@/lib/catalog/server-catalog";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const verified = await getVerifiedStoreAccount(); const { slug } = await params;
  const contract = await loadPublicCatalog(verified?.account);
  const item = contract.items.find((entry) => entry.variantId === slug || entry.productId === slug);
  if (!item) notFound();
  return <PortalPage authenticated={Boolean(verified)}><div className="product-route-back"><Link href={`/products?category=${item.section}`}>← {item.section}</Link></div><ProductDetail item={item} /></PortalPage>;
}
