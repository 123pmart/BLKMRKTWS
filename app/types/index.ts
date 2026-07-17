export type CatalogStatus = "available" | "coming-soon" | "inactive";

export interface Variant {
  id: string;
  item: string;
  upc?: string;
  flavor: string;
  description?: string;
  wholesale: string;
  wholesaleValue?: number;
  map: string;
  mapValue?: number;
  bottle?: string;
  panel?: string;
  available?: boolean;
  status?: CatalogStatus;
  limitedEdition?: boolean;
  runningLow?: boolean;
  galleryImages?: string[];
}

export interface Product {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  accent?: string;
  secondary?: string;
  description: string;
  featured?: boolean;
  bottle: string;
  panel: string;
  variants: Variant[];
  siteVariants?: string[];
  handle?: string;
  siteImages?: string[];
}

export interface FlattenedCatalogItem extends Variant {
  productId: string;
  productTitle: string;
  category: string;
  categorySlug: string;
  section: string;
  fullTitle: string;
  productDescription: string;
  sort: number;
}

export interface CategorySection {
  name: string;
  slug: string;
  short: string;
  accent?: string;
  secondary?: string;
  strap?: string;
}

export interface CartItem {
  variantId: string;
  quantity: number;
}

export interface Store {
  id?: string;
  storeName: string;
  contactName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  notes?: string;
  status?: "active" | "disabled";
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderLine {
  variantId?: string;
  productId?: string;
  product: string;
  flavor: string;
  item: string;
  upc?: string;
  wholesale: string;
  map: string;
  qty: number;
  lineWholesale: number;
  lineMap: number;
  image?: string;
  standardWholesale?: number;
  customPriceApplied?: boolean;
}

export interface Order {
  id: string;
  storeId?: string;
  date: string;
  status: string;
  store: Store;
  lines: OrderLine[];
  totals: {
    units: number;
    wholesale: number;
    map: number;
    subtotal?: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    grandTotal?: number;
  };
  delivery?: Record<string, unknown>;
}

export interface Announcement {
  id: string;
  label: string;
  title: string;
  body: string;
  image?: string;
  date: string;
  audience?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface InstallGuideStep {
  image: string;
  text: string;
}

export interface StoreIdentity {
  accountId: string;
  storeId: string;
  email: string;
  username: string;
  status: StoreAccountStatus;
}

export type StoreAccountStatus = "pending" | "active" | "disabled";

export interface StorePriceOverride {
  id: string;
  storeId: string;
  productId?: string;
  variantId?: string;
  wholesalePrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreAccount {
  id: string;
  storeId: string;
  username: string;
  email: string;
  passwordHash: string;
  status: StoreAccountStatus;
  store: Store;
  priceOverrides: StorePriceOverride[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AccountSession {
  id: string;
  tokenHash: string;
  accountId: string;
  username: string;
  createdAt: string;
  expiresAt: string;
}

export type AccountState =
  | { status: "signed-out" }
  | { status: "unavailable"; reason: string }
  | { status: "authenticated"; identity: StoreIdentity };
