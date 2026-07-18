import { CatalogExplorer } from "@/components/catalog/catalog-explorer";
import { PortalPage } from "@/components/portal/portal-page";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { loadPublicCatalog } from "@/lib/catalog/server-catalog";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const verified = await getVerifiedStoreAccount();
  const [contract, search] = await Promise.all([loadPublicCatalog(verified?.account), searchParams]);
  return <PortalPage authenticated={Boolean(verified)}><CatalogExplorer contract={contract} initialCategory={search.category || "all"} /></PortalPage>;
}
