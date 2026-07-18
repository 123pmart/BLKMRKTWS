/* eslint-disable @next/next/no-img-element */
import catalogPages from "@/../public/catalog-pages.json";
import { PortalPage } from "@/components/portal/portal-page";
import { getVerifiedStoreAccount } from "@/lib/account/auth";

export default async function CatalogPage() {
  const verified = await getVerifiedStoreAccount();
  return <PortalPage authenticated={Boolean(verified)}><header className="route-heading route-heading--split"><div><p className="portal-kicker">Reference</p><h1>Catalog</h1><p>The full BLACKMARKET product catalog. The PDF is loaded only when requested.</p></div><a href="/assets/BlackMarketLabs_Product_Catalog.pdf" download>Download PDF</a></header><section className="react-catalog-pages">{catalogPages.pages.map((page, index) => <figure key={page.page}><figcaption>Page {page.page}</figcaption><img src={page.src} width={page.width} height={page.height} alt={`BLACKMARKET catalog page ${page.page}`} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} decoding="async" /></figure>)}</section></PortalPage>;
}
