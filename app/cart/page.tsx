import { CheckoutCart } from "@/components/cart/checkout-cart";
import { PortalPage } from "@/components/portal/portal-page";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { publicStoreProfile } from "@/lib/account/profile";
import { loadPublicCatalog } from "@/lib/catalog/server-catalog";

export default async function CartPage() {
  const verified = await getVerifiedStoreAccount();
  const contract = await loadPublicCatalog(verified?.account);
  return <PortalPage authenticated={Boolean(verified)}><CheckoutCart contract={contract} profile={verified ? publicStoreProfile(verified.account.store) : null} /></PortalPage>;
}
