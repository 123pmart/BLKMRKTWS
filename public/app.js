import { catalogFlavorAliases, searchCatalogItems } from "/lib/catalog-search.js?v=20260717-global";
import {
  accountDestination,
  goHome as goPortalHome,
  initializePortalHistory,
  PORTAL_HOME_CATEGORY,
  recordPortalNavigation,
  safePortalBack as safePortalHistoryBack,
} from "/lib/portal-history.js?v=20260717-home-final";
import { formatOrderLineMargin } from "/lib/margin-metrics.js?v=20260718-customer-margin";

const DATA_URL = "/catalog-data.json?v=20260629-streettarts-admin";
const CATALOG_PAGES_URL = "/catalog-pages.json?v=20260630-optimized-viewer";
const ORDERS_API_URL = "/api/orders";
const CONTENT_API_URL = "/api/content";
const ORDER_SUBMIT_URL = "/api/send-order";
const ASSET_UPLOAD_URL = "/api/upload-asset";
const ACCOUNT_PRICING_URL = "/api/account/pricing";
const CART_KEY = "blackmarket-wholesale-cart-v4";
const STORE_KEY = "blackmarket-wholesale-store-v3";
const SITE_KEY = "blackmarket-wholesale-site-v1";
const ORDERS_KEY = "blackmarket-wholesale-orders-v1";
const CUSTOM_PRODUCTS_KEY = "blackmarket-wholesale-custom-products-v1";

const MEDIA_PRELOAD_CONCURRENCY = 3;
const ADMIN_SECTIONS = new Set(["orders", "news", "products", "stores", "settings"]);
const CATALOG_TRANSITION_OUT_MS = 90;
const CATALOG_TRANSITION_IN_MS = 260;
let catalogTransitionToken = 0;
let catalogTransitionTimer = 0;
let lastProductTrigger = null;
let lastNewsTrigger = null;
let lastCartTrigger = null;
let toastTimer = 0;

const SECTION_META = [
  { slug: "thermogenics", label: "THERMOGENICS" },
  { slug: "focus", label: "HIGH STIM & NOOTROPICS" },
  { slug: "pump", label: "PUMP" },
  { slug: "strength", label: "STRENGTH" },
  { slug: "raws", label: "RAWS" },
];

const LANDING_OPTIONS = [
  { slug: "thermogenics", label: "THERMOGENICS", match: (item) => item.productId === "cuts-thermogenic-pre-workout" },
  { slug: "focus", label: "HIGH STIM & NOOTROPICS", match: (item) => item.productId === "defy-hyper-stimulant" },
  { slug: "pump", label: "PUMP", match: (item) => item.productId === "pump-hyper-pump-pre-workout" },
  { slug: "strength", label: "STRENGTH", match: (item) => item.productId === "bulk-apex-strength-pre-workout" },
  { slug: "raws", label: "RAWS", match: (item) => item.productId === "creatine-monohydrate-raw" },
  { slug: "all", label: "ALL PRODUCTS", match: (item) => item.productId === "rule-hyper-focus" },
];

const LANDING_THUMBNAILS = {
  "cuts-thermogenic-pre-workout": "/assets/landing/cuts.webp",
  "defy-hyper-stimulant": "/assets/landing/defy.webp",
  "pump-hyper-pump-pre-workout": "/assets/landing/pump.webp",
  "bulk-apex-strength-pre-workout": "/assets/landing/bulk.webp",
  "creatine-monohydrate-raw": "/assets/landing/creatine.webp",
  "rule-hyper-focus": "/assets/landing/rule.webp",
};

const PRODUCT_PANEL_OVERRIDES = {
  "bulk-apex-strength-pre-workout": "/assets/site-images/bulk-apex-strength-pre-workout-5-bulk-apex-sup-facts.jpg",
  "nootropic-high-focus-pre-workout": "/assets/products/nootropic-high-focus-pre-workout-panel.png",
  "scorch-ultra-thermogenic": "/assets/site-images/scorch-ultra-thermogenic-6-scorch-killshot-ingred.jpg",
  "underground-high-stimulant": "/assets/site-images/underground-high-stimulant-6-under-peach-sup-fact.png",
  "tone-weight-loss-pre-workout": "/assets/site-images/tone-weight-loss-pre-workout-panel-tonerl-crop.png",
};

const defaultSite = {
  hiddenVariants: [],
  variantOverrides: {},
  announcements: [
    {
      id: "cuts-natural-launch",
      label: "Launch",
      title: "CUTS Natural is now available",
      body: "New natural flavor, color, and sweetener version of the best-selling CUTS thermogenic formula is live for wholesale ordering.",
      image: "/assets/products/cuts-natural-thermogenic-pre-workout-bottle.png",
      date: "2026-06-16",
    },
    {
      id: "portal-open",
      label: "Portal",
      title: "Wholesale ordering portal is open",
      body: "Build your order, review MAP value, and send the complete order directly to BLACKMARKET from the cart.",
      image: "/assets/products/rule-hyper-focus-bottle.png",
      date: "2026-06-16",
    },
  ],
};

const state = {
  baseProducts: [],
  products: [],
  customProducts: loadJson(CUSTOM_PRODUCTS_KEY, []),
  items: [],
  catalogPages: [],
  cart: loadJson(CART_KEY, {}),
  orders: loadJson(ORDERS_KEY, []),
  site: loadJson(SITE_KEY, defaultSite),
  activeView: "landing",
  activeFilter: "thermogenics",
  query: "",
  adminAuthed: false,
  adminIdentity: null,
  adminUnreadOrders: 0,
  adminNotifiedThrough: 0,
  adminPollTimer: null,
  activeAdminSection: "orders",
  adminProductMode: "flavor",
  adminProductQuery: "",
  adminProductCategory: "all",
  adminAccounts: [],
  adminAccountOrders: [],
  adminPricingCatalog: [],
  adminAccountQuery: "",
  adminAccountStatus: "all",
  cartStep: "items",
  orderStorageMode: "local fallback",
  contentStorageMode: "local fallback",
  pendingRoute: null,
  priceOverrides: [],
  accountAuthenticated: false,
  accountResolved: false,
  adminResolved: false,
};

const mediaPreload = {
  active: 0,
  queue: [],
  seen: new Set(),
};

const dom = {
  mobileNavToggle: document.querySelector("#mobileNavToggle"),
  brandHome: document.querySelector("#brandHome"),
  portalNav: document.querySelector("#portalNav"),
  views: document.querySelectorAll(".view"),
  navButtons: document.querySelectorAll("button[data-view], a[data-view]"),
  landingGrid: document.querySelector("#landingGrid"),
  productsDropdown: document.querySelector("#productsDropdown"),
  headerCartButton: document.querySelector("#headerCartButton"),
  cartView: document.querySelector("#cartView"),
  cartBackdrop: document.querySelector("#cartBackdrop"),
  cartBadge: document.querySelector("#cartBadge"),
  portalBottomCartBadge: document.querySelector("#portalBottomCartBadge"),
  sideCartCount: document.querySelector("#sideCartCount"),
  catalog: document.querySelector("#catalog"),
  catalogCount: document.querySelector("#catalogCount"),
  search: document.querySelector("#searchInput"),
  categoryNav: document.querySelector("#categoryNav"),
  announcementBand: document.querySelector("#announcementBand"),
  catalogPages: document.querySelector("#catalogPages"),
  cartItems: document.querySelector("#cartItems"),
  cartTitleCount: document.querySelector("#cartTitleCount"),
  cartStepButtons: document.querySelectorAll("[data-cart-step]"),
  cartPanels: document.querySelectorAll("[data-cart-panel]"),
  cartNextStep: document.querySelector("#cartNextStep"),
  cartBackStep: document.querySelector("#cartBackStep"),
  closeCartDrawer: document.querySelector("#closeCartDrawer"),
  continueShopping: document.querySelector("#continueShopping"),
  orderUnits: document.querySelector("#orderUnits"),
  orderTotal: document.querySelector("#orderTotal"),
  orderHint: document.querySelector("#orderHint"),
  sendOrder: document.querySelector("#sendOrder"),
  storeForm: document.querySelector("#storeForm"),
  checkoutSalespersonField: document.querySelector("#checkoutSalespersonField"),
  checkoutSalesperson: document.querySelector("#salesperson"),
  newsList: document.querySelector("#newsList"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminPanel: document.querySelector("#adminPanel"),
  adminSectionNav: document.querySelector(".admin-section-nav"),
  adminPages: document.querySelectorAll("[data-admin-page]"),
  announcementForm: document.querySelector("#announcementForm"),
  announcementId: document.querySelector("#announcementId"),
  announcementLabel: document.querySelector("#announcementLabel"),
  announcementDate: document.querySelector("#announcementDate"),
  announcementAudience: document.querySelector("#announcementAudience"),
  announcementTitle: document.querySelector("#announcementTitle"),
  announcementBody: document.querySelector("#announcementBody"),
  announcementImage: document.querySelector("#announcementImage"),
  announcementImageFile: document.querySelector("#announcementImageFile"),
  announcementCtaLabel: document.querySelector("#announcementCtaLabel"),
  announcementCtaUrl: document.querySelector("#announcementCtaUrl"),
  announcementSubmit: document.querySelector("#announcementSubmit"),
  announcementCancel: document.querySelector("#announcementCancel"),
  adminOpenNewsEditor: document.querySelector("#adminOpenNewsEditor"),
  adminCloseNewsEditor: document.querySelector("#adminCloseNewsEditor"),
  adminNewsPreview: document.querySelector("#adminNewsPreview"),
  adminNewsSide: document.querySelector(".admin-news-side"),
  adminNewsList: document.querySelector("#adminNewsList"),
  adminOrdersList: document.querySelector("#adminOrdersList"),
  adminOrderCount: document.querySelector("#adminOrderCount"),
  adminOrderRevenue: document.querySelector("#adminOrderRevenue"),
  adminProductCount: document.querySelector("#adminProductCount"),
  adminNewsCount: document.querySelector("#adminNewsCount"),
  adminStorageMode: document.querySelector("#adminStorageMode"),
  adminOrderStorageStatus: document.querySelector("#adminOrderStorageStatus"),
  adminContentStorageMode: document.querySelector("#adminContentStorageMode"),
  adminContentStorageStatus: document.querySelector("#adminContentStorageStatus"),
  adminLogout: document.querySelector("#adminLogout"),
  customProductForm: document.querySelector("#customProductForm"),
  adminOpenFlavorEditor: document.querySelector("#adminOpenFlavorEditor"),
  adminOpenNewProduct: document.querySelector("#adminOpenNewProduct"),
  adminCloseProductEditor: document.querySelector("#adminCloseProductEditor"),
  adminSheetBackdrop: document.querySelector("#adminSheetBackdrop"),
  customProductModeButtons: document.querySelectorAll("[data-product-mode]"),
  customProductPanels: document.querySelectorAll("[data-product-panel]"),
  customProductParent: document.querySelector("#customProductParent"),
  customProductEditorTitle: document.querySelector("#customProductEditorTitle"),
  customProductSubmit: document.querySelector("#customProductSubmit"),
  customProductTitle: document.querySelector("#customProductTitle"),
  customProductSection: document.querySelector("#customProductSection"),
  customProductFlavor: document.querySelector("#customProductFlavor"),
  customProductItem: document.querySelector("#customProductItem"),
  customProductUpc: document.querySelector("#customProductUpc"),
  customProductCasePack: document.querySelector("#customProductCasePack"),
  customProductStatus: document.querySelector("#customProductStatus"),
  customProductLimited: document.querySelector("#customProductLimited"),
  customProductWholesale: document.querySelector("#customProductWholesale"),
  customProductMap: document.querySelector("#customProductMap"),
  customProductBottle: document.querySelector("#customProductBottle"),
  customProductBottleFile: document.querySelector("#customProductBottleFile"),
  customProductPanel: document.querySelector("#customProductPanel"),
  customProductPanelFile: document.querySelector("#customProductPanelFile"),
  customProductImages: document.querySelector("#customProductImages"),
  customProductGalleryFiles: document.querySelector("#customProductGalleryFiles"),
  customProductHighlights: document.querySelector("#customProductHighlights"),
  customProductDescription: document.querySelector("#customProductDescription"),
  customProductNotes: document.querySelector("#customProductNotes"),
  adminSelectedProduct: document.querySelector("#adminSelectedProduct"),
  adminProductSearch: document.querySelector("#adminProductSearch"),
  adminProductFilter: document.querySelector("#adminProductFilter"),
  adminProductLibraryCount: document.querySelector("#adminProductLibraryCount"),
  adminProductsList: document.querySelector("#adminProductsList"),
  adminCatalogProductCount: document.querySelector("#adminCatalogProductCount"),
  adminCatalogVariantCount: document.querySelector("#adminCatalogVariantCount"),
  adminRefreshContent: document.querySelector("#adminRefreshContent"),
  adminExportContent: document.querySelector("#adminExportContent"),
  adminRefreshAccounts: document.querySelector("#adminRefreshAccounts"),
  adminAccountSearch: document.querySelector("#adminAccountSearch"),
  adminAccountFilter: document.querySelector("#adminAccountFilter"),
  adminCreateAccountForm: document.querySelector("#adminCreateAccountForm"),
  adminStoreAccounts: document.querySelector("#adminStoreAccounts"),
  adminIdentityLabel: document.querySelector("#adminIdentityLabel"),
  adminNotificationBell: document.querySelector("#adminNotificationBell"),
  adminNotificationCount: document.querySelector("#adminNotificationCount"),
  adminPushNotifications: document.querySelector("#adminPushNotifications"),
  adminPushStatus: document.querySelector("#adminPushStatus"),
  productModal: document.querySelector("#productModal"),
  modalContent: document.querySelector("#modalContent"),
  closeProductModal: document.querySelector("#closeProductModal"),
  newsModal: document.querySelector("#newsModal"),
  newsModalContent: document.querySelector("#newsModalContent"),
  closeNewsModal: document.querySelector("#closeNewsModal"),
  imageZoomModal: document.querySelector("#imageZoomModal"),
  imageZoomContent: document.querySelector("#imageZoomContent"),
  closeImageZoom: document.querySelector("#closeImageZoom"),
  orderDownloadModal: document.querySelector("#orderDownloadModal"),
  orderDownloadSummary: document.querySelector("#orderDownloadSummary"),
  downloadOrderCopy: document.querySelector("#downloadOrderCopy"),
  sendWithoutDownload: document.querySelector("#sendWithoutDownload"),
  cancelOrderSend: document.querySelector("#cancelOrderSend"),
  toast: document.querySelector("#toast"),
  pushPrompt: document.querySelector("#pushPrompt"),
  pushPromptTitle: document.querySelector("#pushPromptTitle"),
  pushPromptMessage: document.querySelector("#pushPromptMessage"),
  pushEnableButton: document.querySelector("#pushEnableButton"),
  pushDismissButton: document.querySelector("#pushDismissButton"),
};

init();

async function init() {
  const catalogPagesRequest = fetch(CATALOG_PAGES_URL).catch(() => null);
  const adminSessionRequest = fetch("/api/admin/session", { cache: "no-store" }).catch(() => null);
  const contentRequest = fetch(CONTENT_API_URL, { cache: "no-store" }).catch(() => null);
  const pricingRequest = fetch(ACCOUNT_PRICING_URL, { cache: "no-store" }).catch(() => null);
  const response = await fetch(DATA_URL);
  const data = await response.json();
  state.baseProducts = normalizeProducts(data.products);
  state.products = mergeProducts();
  state.items = buildItems(state.products);
  prepareRouteState();
  preloadProductMedia();
  scheduleNutritionPanelPreload();
  pruneCart();
  hydrateStoreForm();
  syncAccountDestinations();
  if (dom.announcementDate && !dom.announcementDate.value) dom.announcementDate.value = today();
  renderProductEntrypoints();
  renderCategoryNav();
  renderAnnouncements();
  renderNews();
  renderCatalogPages();
  renderCatalog();
  renderCart();
  renderAdmin();
  bindEvents();
  closeAdminEditors();
  setCartStep(state.cartStep);
  setView(state.activeView, { history: false });
  applyPendingRoute();
  void hydratePublicPortalData(contentRequest, pricingRequest);
  void hydrateDeferredPortalData(catalogPagesRequest, adminSessionRequest);
}

async function hydratePublicPortalData(contentRequest, pricingRequest) {
  const [contentResponse, pricingResponse] = await Promise.all([contentRequest, pricingRequest]);
  const contentData = contentResponse?.ok ? await contentResponse.json().catch(() => null) : null;
  const pricingData = pricingResponse?.ok ? await pricingResponse.json().catch(() => null) : null;
  const previousSite = JSON.stringify(state.site);
  const previousPricing = JSON.stringify(state.priceOverrides);

  if (contentData?.content) applyServerContent(contentData.content);
  if (contentData?.storage) state.contentStorageMode = contentData.storage;
  state.priceOverrides = Array.isArray(pricingData?.overrides) ? pricingData.overrides : [];
  state.accountAuthenticated = Boolean(pricingData?.authenticated);
  state.accountResolved = true;
  syncAccountDestinations();

  const catalogChanged = previousSite !== JSON.stringify(state.site) || previousPricing !== JSON.stringify(state.priceOverrides);
  if (catalogChanged) rebuildProductState();
  if (previousSite !== JSON.stringify(state.site)) {
    renderAnnouncements();
    renderNews();
    renderAdminNews();
  }
}

async function hydrateDeferredPortalData(catalogPagesRequest, adminSessionRequest) {
  const [catalogResponse, adminSessionResponse] = await Promise.all([catalogPagesRequest, adminSessionRequest]);
  if (catalogResponse?.ok) {
    const catalogData = await catalogResponse.json().catch(() => ({ pages: [] }));
    state.catalogPages = catalogData.pages || [];
    renderCatalogPages();
  }
  const adminSession = adminSessionResponse?.ok ? await adminSessionResponse.json().catch(() => null) : null;
  state.adminAuthed = Boolean(adminSession?.authenticated);
  state.adminIdentity = adminSession?.identity || null;
  state.adminResolved = true;
  if (state.adminAuthed) {
    await loadServerOrders({ silent: true, initial: true });
    startAdminOrderPolling();
  }
  renderAdmin();
  void syncPushSubscription({ showPrompt: true });
}

function bindEvents() {
  window.addEventListener("popstate", applyLocationRoute);
  document.querySelector("[data-portal-back]")?.addEventListener("click", safePortalBack);
  document.querySelector("[data-portal-home]")?.addEventListener("click", (event) => {
    event.preventDefault();
    goHome();
  });
  document.querySelectorAll("[data-portal-route], [data-account-route]").forEach((link) => {
    link.addEventListener("click", () => recordPortalNavigation(link.getAttribute("href") || "/products"));
  });
  installLegacyMobileNavigation();
  dom.mobileNavToggle?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  dom.brandHome.addEventListener("click", () => goHome());
  dom.headerCartButton.addEventListener("click", (event) => openCartDrawer(event.currentTarget));
  dom.cartBackdrop.addEventListener("click", closeCartDrawer);
  dom.closeCartDrawer.addEventListener("click", closeCartDrawer);
  dom.continueShopping.addEventListener("click", closeCartDrawer);
  dom.cartStepButtons.forEach((button) => {
    button.addEventListener("click", () => setCartStep(button.dataset.cartStep));
  });
  dom.cartNextStep.addEventListener("click", () => setCartStep("details"));
  dom.cartBackStep.addEventListener("click", () => setCartStep("items"));

  dom.portalNav.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-filter-jump]");
    if (jump) {
      setProductFilter(jump.dataset.filterJump);
      return;
    }

    const button = event.target.closest("[data-view]");
    if (!button) return;
    setView(button.dataset.view);
  });

  dom.landingGrid.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-filter-jump]");
    if (!jump) return;
    setProductFilter(jump.dataset.filterJump);
  });

  dom.navButtons.forEach((button) => {
    if (dom.portalNav.contains(button)) return;
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  dom.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCatalog();
  });

  dom.categoryNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    setProductFilter(button.dataset.filter, { keepView: true });
  });

  dom.catalog.addEventListener("click", (event) => {
    const adjust = event.target.closest("[data-adjust]");
    if (adjust) {
      event.stopPropagation();
      const id = adjust.dataset.variant;
      const changed = setQty(id, getQty(id) + Number(adjust.dataset.adjust));
      if (changed && Number(adjust.dataset.adjust) > 0) pulseCart();
      return;
    }

    const detail = event.target.closest("[data-detail]");
    if (detail) openProductModal(detail.dataset.detail, detail);
  });

  dom.catalog.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button")) return;
    const card = event.target.closest("[data-detail]");
    if (!card) return;
    event.preventDefault();
    openProductModal(card.dataset.detail, card);
  });

  dom.cartItems.addEventListener("click", (event) => {
    const adjust = event.target.closest("[data-adjust]");
    if (adjust) {
      setQty(adjust.dataset.variant, getQty(adjust.dataset.variant) + Number(adjust.dataset.adjust));
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) setQty(remove.dataset.remove, 0);
  });

  dom.cartItems.addEventListener("input", (event) => {
    const input = event.target.closest("[data-qty]");
    if (!input) return;
    setQty(input.dataset.qty, Number(input.value || 0));
  });

  dom.newsList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-news]");
    if (!card) return;
    openNewsModal(card.dataset.news, card);
  });

  dom.newsList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-news]");
    if (!card) return;
    event.preventDefault();
    openNewsModal(card.dataset.news, card);
  });

  dom.storeForm.addEventListener("input", () => {
    saveStoreForm();
    updateOrderState();
  });

  dom.sendOrder.addEventListener("click", sendOrder);

  dom.adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.querySelector("#adminUsername").value.trim();
    const password = document.querySelector("#adminPassword").value;
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.ok) {
      state.adminAuthed = true;
      state.adminIdentity = result.identity || null;
      renderAdmin();
      Promise.all([
        loadServerOrders({ silent: true, initial: true }),
        loadServerContent({ silent: true }),
      ]);
      startAdminOrderPolling();
      void syncPushSubscription({ showPrompt: true });
      showToast("Admin unlocked");
    } else {
      showToast(result.message || "Invalid admin login");
    }
  });

  dom.adminSectionNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-section]");
    if (!button) return;
    setAdminSection(button.dataset.adminSection);
  });

  dom.announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await publishAnnouncement();
  });

  dom.adminOpenNewsEditor.addEventListener("click", () => openNewsEditor({ reset: true }));
  dom.adminCloseNewsEditor.addEventListener("click", closeNewsEditor);
  dom.announcementCancel.addEventListener("click", () => {
    clearAnnouncementEditor();
    closeNewsEditor();
  });
  dom.announcementForm.addEventListener("input", renderAdminNewsPreview);

  dom.adminNewsList.addEventListener("click", async (event) => {
    const remove = event.target.closest("[data-remove-announcement]");
    if (remove) {
      const next = state.site.announcements.filter((item) => item.id !== remove.dataset.removeAnnouncement);
      const saved = await commitAnnouncements(next);
      if (saved && dom.announcementId.value === remove.dataset.removeAnnouncement) clearAnnouncementEditor();
      if (saved) showToast("News update deleted");
      return;
    }

    const edit = event.target.closest("[data-edit-announcement]");
    if (edit) {
      editAnnouncement(edit.dataset.editAnnouncement);
      return;
    }

    const move = event.target.closest("[data-move-announcement]");
    if (move) {
      moveAnnouncement(move.dataset.moveAnnouncement, Number(move.dataset.direction || 0));
    }
  });

  dom.adminOrdersList.addEventListener("click", async (event) => {
    const refresh = event.target.closest("[data-refresh-orders]");
    if (refresh) {
      await loadServerOrders();
      return;
    }

    const download = event.target.closest("[data-download-order]");
    if (download) {
      const order = state.orders.find((entry) => entry.id === download.dataset.downloadOrder);
      if (order) downloadOrder(order);
      return;
    }

    const copyEmail = event.target.closest("[data-copy-email]");
    if (copyEmail) {
      const order = state.orders.find((entry) => entry.id === copyEmail.dataset.copyEmail);
      if (order) copyOrderEmail(order);
      return;
    }

    const copySummary = event.target.closest("[data-copy-summary]");
    if (copySummary) {
      const order = state.orders.find((entry) => entry.id === copySummary.dataset.copySummary);
      if (order) copyOrderSummary(order);
      return;
    }

    const copyDraft = event.target.closest("[data-copy-draft]");
    if (copyDraft) {
      const order = state.orders.find((entry) => entry.id === copyDraft.dataset.copyDraft);
      if (order) copyOrderEmailDraft(order);
      return;
    }

    const deleteOrder = event.target.closest("[data-delete-order]");
    if (deleteOrder) {
      await deleteServerOrder(deleteOrder.dataset.deleteOrder);
      return;
    }

    const clear = event.target.closest("[data-clear-orders]");
    if (clear) {
      await clearServerOrders();
    }
  });

  dom.adminLogout.addEventListener("click", async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
    state.adminAuthed = false;
    state.adminIdentity = null;
    state.adminUnreadOrders = 0;
    state.adminNotifiedThrough = 0;
    stopAdminOrderPolling();
    renderAdmin();
    void syncPushSubscription({ audience: "customer" });
  });

  dom.adminNotificationBell?.addEventListener("click", async () => {
    markAdminOrdersRead();
    if (isInstalledApp() && "Notification" in window && Notification.permission !== "granted") {
      await enablePushNotifications();
    }
    if (state.activeView !== "admin") setView("admin");
    setAdminSection("orders");
  });

  dom.adminPushNotifications?.addEventListener("click", enablePushNotifications);
  dom.pushEnableButton?.addEventListener("click", enablePushNotifications);
  dom.pushDismissButton?.addEventListener("click", () => {
    localStorage.setItem("blackmarket-push-dismissed", String(Date.now()));
    hidePushPrompt();
  });

  dom.adminRefreshAccounts?.addEventListener("click", () => loadAdminAccounts());
  dom.adminAccountSearch?.addEventListener("input", (event) => {
    state.adminAccountQuery = event.target.value.trim().toLowerCase();
    renderAdminStoreAccounts();
  });
  dom.adminAccountFilter?.addEventListener("change", (event) => {
    state.adminAccountStatus = event.target.value;
    renderAdminStoreAccounts();
  });
  dom.adminCreateAccountForm?.addEventListener("submit", createAdminStoreAccount);
  dom.adminStoreAccounts?.addEventListener("click", handleAdminStoreAction);

  dom.customProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addCustomProduct();
  });
  dom.adminOpenFlavorEditor.addEventListener("click", () => openProductEditor("flavor"));
  dom.adminOpenNewProduct.addEventListener("click", () => openProductEditor("product"));
  dom.adminCloseProductEditor.addEventListener("click", closeProductEditor);
  dom.adminSheetBackdrop.addEventListener("click", closeAdminEditors);

  dom.customProductModeButtons.forEach((button) => {
    button.addEventListener("click", () => setProductEditorMode(button.dataset.productMode));
  });
  dom.customProductParent.addEventListener("change", syncProductEditorFromParent);
  dom.adminProductSearch.addEventListener("input", (event) => {
    state.adminProductQuery = event.target.value.trim().toLowerCase();
    renderAdminProducts();
  });
  dom.adminProductFilter.addEventListener("change", (event) => {
    state.adminProductCategory = event.target.value;
    renderAdminProducts();
  });

  dom.adminProductsList.addEventListener("click", (event) => {
    const select = event.target.closest("[data-select-product]");
    if (select) {
      openProductEditor("flavor", select.dataset.selectProduct);
      return;
    }
    const hide = event.target.closest("[data-hide-variant]");
    if (hide) {
      hideCatalogVariant(hide.dataset.hideVariant);
      return;
    }
    const restore = event.target.closest("[data-restore-variant]");
    if (restore) {
      restoreCatalogVariant(restore.dataset.restoreVariant);
      return;
    }
    const hideProduct = event.target.closest("[data-hide-product]");
    if (hideProduct) {
      hideCatalogProduct(hideProduct.dataset.hideProduct);
      return;
    }
    const restoreProduct = event.target.closest("[data-restore-product]");
    if (restoreProduct) {
      restoreCatalogProduct(restoreProduct.dataset.restoreProduct);
      return;
    }
    const resetImages = event.target.closest("[data-reset-variant-images]");
    if (resetImages) {
      resetVariantImages(resetImages.dataset.resetVariantImages);
      return;
    }
    const removeImage = event.target.closest("[data-remove-variant-image]");
    if (removeImage) {
      removeVariantGalleryImage(removeImage.dataset.removeVariantImage, Number(removeImage.dataset.imageIndex || -1));
      return;
    }
    const remove = event.target.closest("[data-remove-product]");
    if (!remove) return;
    removeCustomProduct(remove.dataset.removeProduct);
  });

  dom.adminProductsList.addEventListener("change", async (event) => {
    const image = event.target.closest("[data-variant-image-action]");
    if (image) {
      await updateVariantImageOverride(image);
      return;
    }

    const status = event.target.closest("[data-variant-status]");
    if (status) {
      await updateVariantOverride(status.dataset.variantStatus, { status: normalizeVariantStatus(status.value) });
      return;
    }

    const limited = event.target.closest("[data-variant-limited]");
    if (limited) {
      await updateVariantOverride(limited.dataset.variantLimited, { limitedEdition: limited.checked });
      return;
    }

    const runningLow = event.target.closest("[data-variant-running-low]");
    if (runningLow) {
      await updateVariantOverride(runningLow.dataset.variantRunningLow, { runningLow: runningLow.checked });
    }
  });

  dom.adminRefreshContent.addEventListener("click", async () => {
    await loadServerContent();
  });
  dom.adminExportContent.addEventListener("click", exportAdminContentBackup);

  dom.closeProductModal.addEventListener("click", closeProductModal);
  dom.modalContent.addEventListener("click", handleModalQuantityClick);
  dom.productModal.addEventListener("click", (event) => {
    if (event.target === dom.productModal) closeProductModal();
  });
  dom.productModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeProductModal();
  });

  dom.closeNewsModal.addEventListener("click", closeNewsModal);
  dom.newsModal.addEventListener("click", (event) => {
    if (event.target === dom.newsModal) closeNewsModal();
  });
  dom.newsModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeNewsModal();
  });

  dom.closeImageZoom.addEventListener("click", closeImageZoom);
  dom.imageZoomModal.addEventListener("click", (event) => {
    if (event.target === dom.imageZoomModal) closeImageZoom();
  });
  dom.imageZoomModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeImageZoom();
  });

  dom.orderDownloadModal.addEventListener("click", (event) => {
    if (event.target === dom.orderDownloadModal) dom.cancelOrderSend.click();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && document.body.classList.contains("cart-open")) {
      trapCartFocus(event);
      return;
    }
    if (event.key === "Escape") {
      if (dom.imageZoomModal.open) {
        event.preventDefault();
        closeImageZoom();
        return;
      }
      closeProductModal();
      closeNewsModal();
      closeOrderDownloadModal();
      closeCartDrawer();
      closeAdminEditors();
      document.body.classList.remove("nav-open");
    }
  });
}

function normalizeProducts(products) {
  return products.map((product) => {
    const panelOverride = PRODUCT_PANEL_OVERRIDES[product.id] || product.panel;
    const variants = product.variants.map((variant) => ({
      ...variant,
      panel: variant.panel || panelOverride,
    }));
    return {
      ...product,
      panel: panelOverride,
      variants,
      siteImages: unique([...(product.siteImages || []), panelOverride].filter(Boolean)),
    };
  });
}

function mergeProducts() {
  const merged = state.baseProducts.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => applyVariantOverride(variant)),
    siteImages: [...(product.siteImages || [])],
  }));

  state.customProducts.forEach((customProduct) => {
    const customVariants = (customProduct.variants || []).map((variant) => ({
      ...variant,
      customSourceId: customProduct.id,
    })).map((variant) => applyVariantOverride(variant));
    const parent = customProduct.extendsProductId
      ? merged.find((product) => product.id === customProduct.extendsProductId)
      : null;

    if (parent) {
      parent.variants.push(...customVariants);
      parent.siteImages = unique([...(parent.siteImages || []), ...(customProduct.siteImages || [])]);
      return;
    }

    merged.push({
      ...customProduct,
      customSourceId: customProduct.id,
      variants: customVariants,
    });
  });

  return merged;
}

function rebuildProductState() {
  state.products = mergeProducts();
  state.items = buildItems(state.products);
  preloadProductMedia();
  scheduleNutritionPanelPreload();
  pruneCart();
  renderProductEntrypoints();
  renderCategoryNav();
  renderCatalog();
  renderCart();
  renderAdminProducts();
  renderAdminStoreAccounts();
}

function buildItems(products) {
  return products.flatMap((product, productIndex) =>
    product.variants.filter((variant) => !isVariantHidden(variant.id) && normalizeVariantStatus(variant.status) !== "inactive").map((variant, variantIndex) => {
      const item = {
        ...variant,
        productId: product.id,
        productTitle: product.title,
        category: product.category,
        categorySlug: product.categorySlug,
        description: variant.description || product.description,
        productDescription: product.description,
        accent: product.accent,
        bottle: variant.bottle || product.bottle,
        cardImage: variantOverrides()[variant.id]?.bottle
          ? variant.bottle || product.bottle
          : variant.cardImage || variant.bottle || product.bottle,
        panel: variant.panel || product.panel,
        sort: productIndex * 100 + variantIndex,
      };
      item.section = displaySection(item);
      item.fullTitle = `${item.productTitle} ${item.flavor}`.replace(/\s+/g, " ").trim();
      item.aliases = catalogFlavorAliases(item.flavor);
      const standardWholesaleValue = Number(item.wholesaleValue || parseMoney(item.wholesale));
      const accountPrice = effectiveAccountPrice(item, standardWholesaleValue);
      item.standardWholesaleValue = standardWholesaleValue;
      item.wholesaleValue = accountPrice.value;
      item.wholesale = money(accountPrice.value);
      item.customPriceApplied = accountPrice.custom;
      return item;
    }),
  );
}

function effectiveAccountPrice(item, standardValue) {
  const variant = state.priceOverrides.find((entry) => entry.variantId === item.id);
  const product = state.priceOverrides.find((entry) => !entry.variantId && entry.productId === item.productId);
  const selected = variant || product;
  const value = Number(selected?.wholesalePrice);
  return {
    value: selected && Number.isFinite(value) && value >= 0 ? value : standardValue,
    custom: Boolean(selected),
  };
}

function hiddenVariantIds() {
  if (!Array.isArray(state.site.hiddenVariants)) state.site.hiddenVariants = [];
  return state.site.hiddenVariants;
}

function isVariantHidden(id) {
  return hiddenVariantIds().includes(id);
}

function variantOverrides() {
  if (!state.site.variantOverrides || typeof state.site.variantOverrides !== "object" || Array.isArray(state.site.variantOverrides)) {
    state.site.variantOverrides = {};
  }
  return state.site.variantOverrides;
}

function applyVariantOverride(variant) {
  const override = variantOverrides()[variant.id] || {};
  const hasOverrideStatus = Object.prototype.hasOwnProperty.call(override, "status");
  const status = normalizeVariantStatus(hasOverrideStatus ? override.status : variant.status || (variant.available === false ? "coming-soon" : "available"));
  return {
    ...variant,
    bottle: override.bottle || variant.bottle,
    panel: override.panel || variant.panel,
    galleryImages: Array.isArray(override.images) && override.images.length ? [...override.images] : variant.galleryImages,
    status,
    limitedEdition: typeof override.limitedEdition === "boolean" ? override.limitedEdition : Boolean(variant.limitedEdition),
    runningLow: typeof override.runningLow === "boolean" ? override.runningLow : Boolean(variant.runningLow),
    available: status === "available",
  };
}

function normalizeVariantStatus(status) {
  return ["available", "coming-soon", "inactive"].includes(status) ? status : "available";
}

function variantStatusLabel(status) {
  if (status === "coming-soon") return "Coming Soon";
  if (status === "inactive") return "Inactive";
  return "Live";
}

function isOrderable(item) {
  return normalizeVariantStatus(item?.status) === "available";
}

function cleanVariantOverrides(overrides) {
  return Object.fromEntries(
    Object.entries(overrides || {})
      .map(([id, override]) => {
        if (!id || !override || typeof override !== "object" || Array.isArray(override)) return null;
        const clean = {};
        if (override.status) clean.status = normalizeVariantStatus(override.status);
        if (typeof override.limitedEdition === "boolean") clean.limitedEdition = override.limitedEdition;
        if (typeof override.runningLow === "boolean") clean.runningLow = override.runningLow;
        if (override.bottle) clean.bottle = String(override.bottle).trim();
        if (override.panel) clean.panel = String(override.panel).trim();
        const images = unique(Array.isArray(override.images) ? override.images.map((entry) => String(entry || "").trim()).filter(Boolean) : []).slice(0, 16);
        if (images.length) clean.images = images;
        return Object.keys(clean).length ? [String(id), clean] : null;
      })
      .filter(Boolean),
  );
}

function displaySection(item) {
  const title = `${item.productTitle} ${item.flavor}`.toLowerCase();
  const productTitle = item.productTitle.toLowerCase();
  if (/\braw\b/.test(productTitle) || title.includes("beta-alanine") || title.includes("creatine") || title.includes("citrulline")) {
    return "raws";
  }
  if (["thermogenics", "focus", "pump", "strength", "raws"].includes(item.categorySlug)) return item.categorySlug;
  if (title.includes("nitricoxide") || title.includes("pump") || title.includes("glycerol")) return "pump";
  if (title.includes("defy") || title.includes("underground") || title.includes("rule") || title.includes("nootropic") || title.includes("bump")) {
    return "focus";
  }
  if (item.categorySlug === "strength") return "strength";
  return "thermogenics";
}

function renderProductEntrypoints() {
  const cards = LANDING_OPTIONS.map((option, index) => {
    const item = representativeItem(option);
    const image = landingImage(item);
    return `
      <button class="landing-card" type="button" data-filter-jump="${escapeHtml(option.slug)}">
        <span class="landing-card-media">${image ? `<img src="${escapeHtml(image)}" alt="" width="480" height="480" loading="${index < 2 ? "eager" : "lazy"}" decoding="async" ${index === 0 ? 'fetchpriority="high"' : ""} />` : ""}</span>
        <span class="landing-card-label">${escapeHtml(option.label)}</span>
      </button>
    `;
  }).join("");

  dom.landingGrid.innerHTML = cards;
  dom.productsDropdown.innerHTML = LANDING_OPTIONS.map((option) => {
    const item = representativeItem(option);
    return `
      <button type="button" data-filter-jump="${escapeHtml(option.slug)}">
        ${item ? `<img src="${escapeHtml(item.cardImage || item.bottle)}" alt="" width="160" height="160" loading="lazy" decoding="async" />` : ""}
        <span>${escapeHtml(option.label)}</span>
      </button>
    `;
  }).join("");
}

function representativeItem(option) {
  return state.items.find(option.match) || state.items.find((item) => item.section === option.slug) || state.items[0];
}

function landingImage(item) {
  if (!item) return "";
  if (variantOverrides()[item.id]?.bottle) return item.bottle;
  return LANDING_THUMBNAILS[item.productId] || item.bottle;
}

function renderCategoryNav() {
  dom.categoryNav.innerHTML = LANDING_OPTIONS
    .map((filter, index) => {
      const item = representativeItem(filter);
      const active = state.activeFilter === filter.slug ? "active" : "";
      return `
        <button class="category-tile ${active}" type="button" data-filter="${escapeHtml(filter.slug)}" aria-pressed="${active ? "true" : "false"}">
          <span class="category-tile-media">${item ? `<img src="${escapeHtml(item.cardImage || item.bottle)}" alt="" width="320" height="320" loading="${index < 2 ? "eager" : "lazy"}" decoding="async" />` : ""}</span>
          <span class="category-tile-label">${escapeHtml(filter.label)}</span>
        </button>
      `;
    })
    .join("");
}

function setProductFilter(filter, options = {}) {
  if (state.activeFilter === filter && options.keepView) return;
  state.activeFilter = filter;
  if (!options.keepQuery) {
    state.query = "";
    dom.search.value = "";
  }
  preloadFilterMedia(filter);
  renderCategoryNav();
  renderCatalog({ animate: options.keepView });
  const path = filter && filter !== "all" ? `/products?category=${encodeURIComponent(filter)}` : "/products";
  if (!options.keepView) {
    setView("products", { path });
  } else {
    pushPortalRoute(path, { view: "products", filter });
  }
}

function renderAnnouncements() {
  if (!dom.announcementBand) return;
  const latest = state.site.announcements[0];
  if (!latest) {
    dom.announcementBand.innerHTML = "";
    return;
  }
  dom.announcementBand.innerHTML = `
    <button type="button" data-news-jump>
      <span>${escapeHtml(latest.label || "Update")}</span>
      <strong>${escapeHtml(latest.title)}</strong>
      <small>${escapeHtml(latest.body)}</small>
    </button>
  `;
  dom.announcementBand.querySelector("[data-news-jump]").addEventListener("click", () => setView("news"));
}

function renderNews() {
  if (!state.site.announcements.length) {
    dom.newsList.innerHTML = `<div class="empty-state">No updates posted yet.</div>`;
    return;
  }
  dom.newsList.innerHTML = state.site.announcements.map(renderNewsCard).join("");
}

function renderNewsCard(item, index) {
  const image = announcementImage(item, index);
  return `
    <article class="news-card" data-news="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(item.title)}">
      <div class="news-thumb">
        ${image ? `<img src="${escapeHtml(image)}" alt="" width="1200" height="675" loading="lazy" decoding="async" />` : ""}
      </div>
      <div class="news-copy">
        <div class="news-meta">
          <span>${escapeHtml(item.label || "Update")}</span>
          <time>${escapeHtml(item.date || "")}</time>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.body)}</p>
      </div>
    </article>
  `;
}

function renderCatalogPages() {
  if (!dom.catalogPages) return;
  if (!state.catalogPages.length) {
    dom.catalogPages.innerHTML = `<div class="empty-state">Catalog pages are still rendering.</div>`;
    return;
  }
  dom.catalogPages.innerHTML = state.catalogPages
    .map((page, index) => `
      <figure class="catalog-page is-loading">
        <figcaption>Loading page ${page.page}</figcaption>
        <img src="${escapeHtml(page.src)}" width="${page.width}" height="${page.height}" alt="BLACKMARKET catalog page ${page.page}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" ${index === 0 ? 'fetchpriority="high"' : ""} />
      </figure>
    `)
    .join("");

  dom.catalogPages.querySelectorAll(".catalog-page img").forEach((image) => {
    const page = image.closest(".catalog-page");
    const settle = (loaded) => {
      page.classList.remove("is-loading");
      page.classList.toggle("is-loaded", loaded);
      page.classList.toggle("is-failed", !loaded);
      if (!loaded) page.querySelector("figcaption").textContent = "Page unavailable - use Download PDF";
    };
    image.addEventListener("load", () => settle(true), { once: true });
    image.addEventListener("error", () => settle(false), { once: true });
    if (image.complete) settle(image.naturalWidth > 0);
  });
}

function openNewsModal(id, trigger = document.activeElement) {
  const index = state.site.announcements.findIndex((entry) => entry.id === id);
  const item = state.site.announcements[index];
  if (!item) return;
  const image = announcementImage(item, index);
  dom.newsModalContent.innerHTML = `
    <article class="news-detail">
      ${image ? `<img src="${escapeHtml(image)}" alt="" width="1200" height="675" />` : ""}
      <div>
        <p class="eyebrow">${escapeHtml(item.label || "Update")} / ${escapeHtml(item.date || "")}${item.audience ? ` / ${escapeHtml(item.audience)}` : ""}</p>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.body)}</p>
        ${item.ctaLabel && item.ctaUrl ? `<a class="news-cta" href="${escapeHtml(item.ctaUrl)}">${escapeHtml(item.ctaLabel)}</a>` : ""}
      </div>
    </article>
  `;
  lastNewsTrigger = trigger instanceof HTMLElement ? trigger : null;
  showDialog(dom.newsModal);
}

function closeNewsModal() {
  const wasOpen = dom.newsModal.open;
  if (wasOpen) dom.newsModal.close();
  if (!dom.productModal.open && !dom.orderDownloadModal.open) document.body.classList.remove("modal-open");
  if (wasOpen) restoreFocus(lastNewsTrigger);
}

function closeOrderDownloadModal() {
  if (dom.orderDownloadModal.open) dom.orderDownloadModal.close();
  if (!dom.productModal.open && !dom.newsModal.open) document.body.classList.remove("modal-open");
}

function catalogHtml(items) {
  if (!items.length) return `<div class="empty-state"><strong>No products found</strong><span>Try another category or search term.</span></div>`;
  return `
    <section class="sku-section">
      <div class="section-title">
        <div>
          <p>${items.length} SKUs</p>
          <h2>${escapeHtml(activeFilterLabel())}</h2>
        </div>
      </div>
      ${renderUnifiedSkuGrid(items)}
    </section>
  `;
}

function renderCatalog(options = {}) {
  const items = filteredItems();
  if (dom.catalogCount) dom.catalogCount.textContent = String(items.length);
  const html = catalogHtml(items);
  const shouldAnimate =
    options.animate &&
    document.body.dataset.view === "products" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  clearTimeout(catalogTransitionTimer);
  catalogTransitionToken += 1;
  const token = catalogTransitionToken;

  if (!shouldAnimate) {
    dom.catalog.classList.remove("catalog-transitioning", "catalog-transition-out", "catalog-transition-in");
    dom.catalog.innerHTML = html;
    return;
  }

  dom.catalog.classList.add("catalog-transitioning", "catalog-transition-out");
  dom.catalog.classList.remove("catalog-transition-in");

  catalogTransitionTimer = window.setTimeout(() => {
    if (token !== catalogTransitionToken) return;
    dom.catalog.innerHTML = html;
    dom.catalog.classList.remove("catalog-transition-out");
    dom.catalog.classList.add("catalog-transition-in");

    catalogTransitionTimer = window.setTimeout(() => {
      if (token !== catalogTransitionToken) return;
      dom.catalog.classList.remove("catalog-transitioning", "catalog-transition-in");
    }, CATALOG_TRANSITION_IN_MS);
  }, CATALOG_TRANSITION_OUT_MS);
}

function renderUnifiedSkuGrid(items) {
  return `
    <div class="sku-row unified-grid">
      ${items.map((item, index) => renderSkuCard(item, index)).join("")}
    </div>
  `;
}

function renderProductLines(items) {
  const grouped = groupBy(items, (item) => (item.section === "raws" ? "RAWS" : item.productTitle));
  return Object.entries(grouped)
    .map(([productTitle, productItems]) => {
      const rowId = slugify(productTitle);
      return `
        <section class="product-line">
          <div class="line-head">
            <div>
              <h3>${escapeHtml(productTitle)}</h3>
              <p>${lineCountLabel(productItems)}</p>
            </div>
          </div>
          <div class="sku-row" id="row-${rowId}">
            ${productItems.map((item, index) => renderSkuCard(item, index)).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function lineCountLabel(items) {
  if (items[0]?.section === "raws") return `${items.length} products`;
  return `${items.length} flavor${items.length === 1 ? "" : "s"}`;
}

function activeFilterLabel() {
  if (state.query) return "SEARCH RESULTS";
  if (state.activeFilter === "all") return "ALL PRODUCTS";
  return SECTION_META.find((section) => section.slug === state.activeFilter)?.label || "PRODUCTS";
}

function renderSkuCard(item, index = 99) {
  const orderable = isOrderable(item);
  const statusPrefix = item.limitedEdition ? "Limited" : "";
  const flavorLabel = statusPrefix ? `${statusPrefix} / ${item.flavor}` : item.flavor;
  return `
    <article class="sku-card ${!orderable ? "is-coming-soon" : ""}" data-detail="${item.id}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.fullTitle)} details">
      <div class="sku-meta">
        <span class="sku-number">#${escapeHtml(item.item)}</span>
        <span class="sku-flavor-chip ${item.limitedEdition ? "sku-limited" : ""} ${!orderable ? "sku-coming" : ""}">${escapeHtml(flavorLabel)}</span>
      </div>
      <div class="bottle-stage">
        <img src="${escapeHtml(item.cardImage || item.bottle)}" alt="${escapeHtml(item.fullTitle)} bottle" width="480" height="480" loading="${index < 4 ? "eager" : "lazy"}" decoding="async" ${index === 0 ? 'fetchpriority="high"' : ""} />
      </div>
      <h4>${escapeHtml(item.fullTitle)}</h4>
      <div class="sku-price">
        <div class="sku-price-line">
          <strong>${escapeHtml(item.wholesale)}</strong>
          ${item.runningLow ? `<em class="sku-low-stock">RUNNING LOW</em>` : ""}
        </div>
        <span>MAP ${escapeHtml(item.map)}</span>
      </div>
      ${renderMiniQty(item.id)}
    </article>
  `;
}

function preloadProductMedia() {
  if (state.activeView === "products") {
    const firstProduct = state.items.find((item) => item.section === state.activeFilter) || state.items[0];
    enqueueMediaPreloads(firstProduct ? [firstProduct.cardImage || firstProduct.bottle] : []);
    return;
  }
  const landingItems = LANDING_OPTIONS
    .map((option) => state.items.find(option.match))
    .filter(Boolean)
    .slice(0, 2);
  const announcementUrls = state.site.announcements.length ? [announcementImage(state.site.announcements[0], 0)] : [];
  enqueueMediaPreloads(unique([
    ...landingItems.map(landingImage),
    ...announcementUrls,
  ]));
}

function scheduleNutritionPanelPreload() {
  const preloadPanels = () => {
    const firstVisible = state.items.find((item) => item.section === state.activeFilter) || state.items[0];
    if (firstVisible?.panel) enqueueMediaPreloads([firstVisible.panel]);
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preloadPanels, { timeout: 2500 });
  } else {
    window.setTimeout(preloadPanels, 1200);
  }
}

function preloadFilterMedia(filter) {
  const items = state.items.filter((item) => filter === "all" || item.section === filter);
  enqueueMediaPreloads(unique(items.slice(0, 4).map((item) => item.cardImage || item.bottle)));
}

function enqueueMediaPreloads(urls) {
  urls
    .filter(Boolean)
    .forEach((url) => {
      if (mediaPreload.seen.has(url)) return;
      mediaPreload.seen.add(url);
      mediaPreload.queue.push(url);
    });
  pumpMediaPreloadQueue();
}

function pumpMediaPreloadQueue() {
  while (mediaPreload.active < MEDIA_PRELOAD_CONCURRENCY && mediaPreload.queue.length) {
    const url = mediaPreload.queue.shift();
    mediaPreload.active += 1;
    const image = new Image();
    const done = () => {
      mediaPreload.active = Math.max(0, mediaPreload.active - 1);
      pumpMediaPreloadQueue();
    };
    image.decoding = "async";
    image.loading = "eager";
    image.onload = done;
    image.onerror = done;
    image.src = url;
    if (image.decode) image.decode().catch(() => {});
  }
}

function renderMiniQty(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (item && !isOrderable(item)) {
    return `
      <div class="qty-mini is-disabled" aria-label="Coming soon">
        <span>Coming soon</span>
      </div>
    `;
  }
  const qty = getQty(id);
  return `
    <div class="qty-mini" aria-label="Quantity controls">
      <button type="button" data-adjust="-1" data-variant="${id}" aria-label="Decrease quantity">-</button>
      <span data-qty-value="${id}">${qty}</span>
      <button type="button" data-adjust="1" data-variant="${id}" aria-label="Increase quantity">+</button>
    </div>
  `;
}

function filteredItems() {
  const source = state.query
    ? searchCatalogItems(state.items, state.query)
    : state.items.filter((item) => state.activeFilter === "all" || item.section === state.activeFilter);
  return source.sort((a, b) => {
    if (state.query) return 0;
    return sectionIndex(a.section) - sectionIndex(b.section) || productRank(a) - productRank(b) || a.sort - b.sort;
  });
}

function sectionIndex(slug) {
  return SECTION_META.findIndex((section) => section.slug === slug);
}

function productRank(item) {
  const title = item.productTitle.toLowerCase();
  if (item.section === "pump") {
    if (title.includes("pump hyper")) return 10;
    if (title.includes("cuts pump")) return 20;
    if (title.includes("nitricoxide")) return 30;
    return 99;
  }
  if (item.section !== "focus") return 0;
  if (title.includes("defy")) return 10;
  if (title.includes("rule")) return 20;
  if (title.includes("underground")) return 30;
  if (title.includes("nootropic")) return 40;
  if (title.includes("bump")) return 50;
  return 99;
}

function openProductModal(itemId, trigger = document.activeElement, options = {}) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  const product = state.products.find((entry) => entry.id === item.productId);
  const gallery = imageGalleryForItem(item, product);
  enqueueMediaPreloads(gallery.map((image) => image.src));
  dom.modalContent.innerHTML = `
    <div class="product-detail">
      <div class="detail-layout">
        <div class="detail-left">
          <div class="detail-bottle">
            <img src="${escapeHtml(item.bottle)}" alt="${escapeHtml(item.fullTitle)} bottle" width="700" height="700" />
          </div>
          <div class="detail-copy">
            <p class="eyebrow">#${escapeHtml(item.item)}${item.limitedEdition ? " / Limited Edition" : ""}</p>
            <h2>${escapeHtml(item.fullTitle)}</h2>
            <p>${escapeHtml(item.description || item.productDescription)}</p>
            ${!isOrderable(item) ? `<p class="detail-status-note">Coming soon. Ordering opens when this item is available.</p>` : ""}
            <div class="detail-price">
              <div>
                <span>Wholesale</span>
                <strong>${escapeHtml(item.wholesale)}</strong>
                ${item.runningLow ? `<em class="detail-low-stock">RUNNING LOW</em>` : ""}
              </div>
              <div><span>MAP</span><strong>${escapeHtml(item.map)}</strong></div>
            </div>
            <div class="detail-actions">
              ${renderMiniQty(item.id)}
            </div>
          </div>
        </div>
        <div class="nutrition-block">
          <div>
            <span>Supplement Facts</span>
            <strong id="detailMediaTitle">${escapeHtml(item.productTitle)}</strong>
          </div>
          <button class="nutrition-zoom" type="button" data-zoom-image aria-label="Enlarge ${escapeHtml(item.fullTitle)} Supplement Facts">
            <img id="detailMediaImage" src="${escapeHtml(item.panel)}" alt="${escapeHtml(item.fullTitle)} nutrition label" width="1000" height="1000" />
            <span>View larger</span>
          </button>
        </div>
      </div>
      ${gallery.length > 1 ? `
        <div class="detail-gallery" aria-label="Product images">
          ${gallery.map((image, index) => `
            <button class="${index === 0 ? "active" : ""}" type="button" data-gallery-src="${escapeHtml(image.src)}" data-gallery-title="${escapeHtml(image.label)}" aria-pressed="${index === 0 ? "true" : "false"}">
              <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.label)}" width="240" height="240" loading="lazy" decoding="async" />
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
  lastProductTrigger = trigger instanceof HTMLElement ? trigger : null;
  const modalLabel = document.querySelector("#productModalLabel");
  if (modalLabel) modalLabel.textContent = item.flavor || "Product Details";
  showDialog(dom.productModal);
  if (options.history !== false) {
    pushPortalRoute(`/products/${encodeURIComponent(item.id)}`, {
      modal: "product",
      itemId: item.id,
      parent: `${window.location.pathname}${window.location.search}`,
    });
  }
}

function showDialog(dialog) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    if (!dialog.open) dialog.showModal();
    window.setTimeout(() => dialog.querySelector(".icon-close")?.focus({ preventScroll: true }), 30);
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(scrollX, scrollY);
    window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
  });
}

function imageGalleryForItem(item, product) {
  if (Array.isArray(item.galleryImages) && item.galleryImages.length) {
    return item.galleryImages.map((src, index) => ({
      src,
      label: galleryImageLabel(src, item, index),
    }));
  }
  const images = [
    { src: item.panel, label: "Supplement Facts" },
    { src: item.bottle, label: `${item.flavor} Front` },
    ...rotatedImagesForItem(item, product).map((src, index) => ({ src, label: `Rotated Bottle ${index + 1}` })),
  ].filter((image) => image.src);
  const seen = new Set();
  return images.filter((image) => {
    if (seen.has(image.src)) return false;
    seen.add(image.src);
    return true;
  });
}

function galleryImageLabel(src, item, index) {
  if (src === item.panel) return "Supplement Facts";
  if (src === item.bottle) return `${item.flavor} Front`;
  const normalized = normalizeSearch(src);
  if (isPanelImage(normalized)) return "Supplement Facts";
  if (isFrontBottleImage(src)) return `${item.flavor} Front`;
  if (isRotatedBottleImage(src)) return `Bottle View ${index + 1}`;
  return `Product Image ${index + 1}`;
}

function rotatedImagesForItem(item, product) {
  if (product?.id === "tone-weight-loss-pre-workout") return [];
  const sourceImages = (product?.siteImages || []).filter((src) => src && src !== item.bottle && src !== item.panel);
  const productImages = sourceImages.filter((src) => !isPanelImage(normalizeSearch(src)));
  const rotated = productImages.filter(isRotatedBottleImage);
  const flavorRotated = rotated.filter((src) => imageMatchesFlavor(src, item.flavor));
  const selected = pickRotatedPair(flavorRotated.length >= 2 ? flavorRotated : rotated);

  if (selected.length < 2) {
    const fallback = productImages
      .filter((src) => !selected.includes(src) && !isFrontBottleImage(src))
      .sort((a, b) => fallbackImageScore(a) - fallbackImageScore(b));
    selected.push(...fallback.slice(0, 2 - selected.length));
  }

  return selected.slice(0, 2);
}

function pickRotatedPair(images) {
  const sorted = [...images].sort((a, b) => rotatedImageScore(a) - rotatedImageScore(b));
  const selected = [];
  const first = sorted.find((src) => /\bside\s*1\b|side1/.test(normalizeSearch(src))) || sorted[0];
  if (first) selected.push(first);
  const second = sorted.find((src) => src !== first && (/\bside\s*2\b|side2|\bback\b/.test(normalizeSearch(src)))) || sorted.find((src) => src !== first);
  if (second) selected.push(second);
  return selected;
}

function isRotatedBottleImage(src) {
  const image = normalizeSearch(src);
  return /\bside\b|side1|side2|sidefront|\bback\b/.test(image);
}

function isFrontBottleImage(src) {
  const image = normalizeSearch(src);
  if (isRotatedBottleImage(src)) return false;
  return /\bfront\b|front|final|bottle\s*1/.test(image);
}

function imageMatchesFlavor(src, flavor) {
  const image = normalizeSearch(src);
  return flavorAliases(flavor).some((alias) => image.includes(alias));
}

function rotatedImageScore(src) {
  const image = normalizeSearch(src);
  if (/\bside\s*1\b|side1/.test(image)) return 10;
  if (/\bside\s*2\b|side2/.test(image)) return 20;
  if (/\bback\b/.test(image)) return 30;
  if (/\bside\b/.test(image)) return 40;
  return 99;
}

function fallbackImageScore(src) {
  const image = normalizeSearch(src);
  if (image.includes("tonerl")) return 10;
  if (image.includes("wrap") || image.includes("label")) return 20;
  if (image.includes("front") || image.includes("final")) return 90;
  return 50;
}

function isPanelImage(image) {
  return ["suppfacts", "supfact", "facts", "fact", "ingred", "ingrd", "ingredients", "panel"].some((token) => image.includes(token));
}

function flavorAliases(flavor) {
  const base = normalizeSearch(flavor);
  const compact = base.replace(/\s+/g, "");
  const aliases = new Set([base, compact]);
  aliases.add(base.replace(/\s+/g, ""));
  if (base.includes("blue") && base.includes("razz")) aliases.add("bluerazz");
  if (base.includes("candy") && base.includes("dust")) aliases.add("candydust");
  if (base.includes("candy") && base.includes("road")) aliases.add("candyroad");
  if (base.includes("cherry") && base.includes("slush")) aliases.add("cherryslush");
  if (base.includes("fruit") && base.includes("punch")) aliases.add("fruitpunch");
  if (base.includes("grape") && base.includes("lime")) aliases.add("glr");
  if (base.includes("hawaiian") || base.includes("kill")) aliases.add("killshot");
  if (base.includes("orange") && base.includes("mango")) aliases.add("orangemango");
  if (base.includes("peach")) aliases.add("peach");
  if (base.includes("purge") && base.includes("pop")) aliases.add("purgepop");
  if (base.includes("raspberry") && base.includes("lemonade")) aliases.add("rasplem");
  if (base.includes("razz") && base.includes("mango")) aliases.add("razzmango");
  if (base.includes("sour") && base.includes("gummy")) aliases.add("sourgum");
  if (base.includes("strawberry") && base.includes("kiwi")) aliases.add("strwkiwi");
  if (base.includes("strawberry") && base.includes("lemonade")) aliases.add("strawlem");
  if (base.includes("watermelon") && base.includes("lemonade")) {
    aliases.add("waterlem");
    aliases.add("watlem");
  }
  return [...aliases].filter(Boolean);
}

function normalizeSearch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function handleModalQuantityClick(event) {
  const zoomButton = event.target.closest("[data-zoom-image]");
  if (zoomButton) {
    const image = zoomButton.querySelector("img");
    if (image) openImageZoom(image.src, image.alt);
    return;
  }

  const galleryButton = event.target.closest("[data-gallery-src]");
  if (galleryButton) {
    event.stopPropagation();
    const image = document.querySelector("#detailMediaImage");
    const title = document.querySelector("#detailMediaTitle");
    if (image) image.src = galleryButton.dataset.gallerySrc;
    if (title) title.textContent = galleryButton.dataset.galleryTitle || "Product Image";
    document.querySelectorAll("[data-gallery-src]").forEach((button) => {
      const active = button === galleryButton;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    return;
  }

  const adjust = event.target.closest("[data-adjust]");
  if (!adjust) return;
  event.stopPropagation();
  const id = adjust.dataset.variant;
  const changed = setQty(id, getQty(id) + Number(adjust.dataset.adjust));
  if (changed && Number(adjust.dataset.adjust) > 0) pulseCart();
}

function closeProductModal(options = {}) {
  const wasOpen = dom.productModal.open;
  if (wasOpen) dom.productModal.close();
  if (!dom.newsModal.open && !dom.orderDownloadModal.open) document.body.classList.remove("modal-open");
  if (wasOpen) restoreFocus(lastProductTrigger);
  if (wasOpen && options.history !== false && window.location.pathname.startsWith("/products/")) {
    if (window.history.state?.blackmarketPortal?.parent) {
      window.history.back();
    } else {
      window.history.replaceState({ blackmarketPortal: { view: "products" } }, "", "/products");
      setView("products", { history: false });
    }
  }
}

function openImageZoom(src, alt) {
  dom.imageZoomContent.src = src;
  dom.imageZoomContent.alt = alt || "Expanded product image";
  if (!dom.imageZoomModal.open) dom.imageZoomModal.showModal();
  dom.imageZoomModal.querySelector(".image-zoom-frame")?.scrollTo({ top: 0, left: 0 });
  dom.imageZoomModal.scrollTo?.({ top: 0, left: 0 });
  dom.closeImageZoom.focus({ preventScroll: true });
}

function closeImageZoom() {
  if (!dom.imageZoomModal.open) return;
  dom.imageZoomModal.close();
  document.querySelector("[data-zoom-image]")?.focus({ preventScroll: true });
}

function addToCart(id) {
  if (setQty(id, getQty(id) + 1)) pulseCart();
}

function setQty(id, requestedQty) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return false;
  const next = Math.max(0, Math.floor(Number.isFinite(requestedQty) ? requestedQty : 0));
  if (!isOrderable(item) && next > 0) {
    delete state.cart[id];
    saveJson(CART_KEY, state.cart);
    renderCart();
    syncQtyControls();
    showToast(`${item.fullTitle} is coming soon`);
    return false;
  }
  if (next === 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = next;
  }
  saveJson(CART_KEY, state.cart);
  renderCart();
  syncQtyControls();
  return true;
}

function getQty(id) {
  return state.cart[id] || 0;
}

function cartLines() {
  return Object.entries(state.cart)
    .map(([id, qty]) => {
      const item = state.items.find((entry) => entry.id === id);
      if (!item || !isOrderable(item)) return null;
      return { item, qty, lineWholesale: qty * item.wholesaleValue, lineMap: qty * item.mapValue };
    })
    .filter(Boolean);
}

function cartTotals(lines = cartLines()) {
  return lines.reduce(
    (totals, line) => {
      totals.units += line.qty;
      totals.wholesale += line.lineWholesale;
      totals.map += line.lineMap;
      return totals;
    },
    { units: 0, wholesale: 0, map: 0 },
  );
}

function renderCart() {
  const lines = cartLines();
  const totals = cartTotals(lines);
  dom.cartBadge.textContent = String(totals.units);
  if (dom.portalBottomCartBadge) {
    dom.portalBottomCartBadge.textContent = totals.units > 99 ? "99+" : String(totals.units);
    dom.portalBottomCartBadge.hidden = totals.units === 0;
    dom.portalBottomCartBadge.parentElement?.setAttribute("aria-label", `Cart, ${totals.units} item${totals.units === 1 ? "" : "s"}`);
  }
  if (dom.sideCartCount) dom.sideCartCount.textContent = String(totals.units);
  dom.cartTitleCount.textContent = String(totals.units);
  dom.orderUnits.textContent = `${totals.units} item${totals.units === 1 ? "" : "s"}`;
  dom.orderTotal.textContent = money(totals.wholesale);
  dom.cartItems.innerHTML = lines.length ? lines.map(renderCartLine).join("") : `<div class="empty-state">Cart is empty.</div>`;
  updateOrderState();
  syncQtyControls();
}

function syncQtyControls() {
  state.items.forEach((item) => {
    const qty = getQty(item.id);
    document.querySelectorAll(`[data-qty-value="${CSS.escape(item.id)}"]`).forEach((node) => {
      node.textContent = String(qty);
      node.closest(".qty-mini")?.classList.toggle("has-qty", qty > 0);
    });
    document.querySelectorAll(`[data-qty="${CSS.escape(item.id)}"]`).forEach((node) => {
      node.value = String(qty);
    });
  });
}

function renderCartLine({ item, qty, lineWholesale }) {
  return `
    <article class="cart-line">
      <img src="${escapeHtml(item.bottle)}" alt="${escapeHtml(item.fullTitle)} bottle" width="180" height="180" loading="lazy" decoding="async" />
      <div>
        <h3>${escapeHtml(item.fullTitle)}</h3>
        <p>${escapeHtml(item.wholesale)} each / MAP ${escapeHtml(item.map)}</p>
        <div class="qty-control">
          <button type="button" data-adjust="-1" data-variant="${item.id}" aria-label="Decrease quantity">-</button>
          <input type="number" min="0" step="1" inputmode="numeric" data-qty="${item.id}" value="${qty}" aria-label="Quantity" />
          <button type="button" data-adjust="1" data-variant="${item.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <strong>${money(lineWholesale)}</strong>
      <button class="remove-line" type="button" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.fullTitle)}">x</button>
    </article>
  `;
}

function updateOrderState() {
  const hasItems = cartLines().length > 0;
  const ready = state.accountResolved && hasItems && dom.storeForm.checkValidity();
  dom.cartNextStep.disabled = !hasItems;
  dom.sendOrder.disabled = !ready;
  dom.orderHint.textContent = ready
    ? "Ready for final review"
    : !state.accountResolved
      ? "Checking store account"
    : hasItems
      ? "Complete buyer and shipping details"
      : "Add products to begin your order";
}

function setCartStep(step) {
  state.cartStep = step === "details" ? "details" : "items";
  document.body.dataset.cartStep = state.cartStep;
  dom.cartStepButtons.forEach((button) => {
    const active = button.dataset.cartStep === state.cartStep;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "step" : "false");
  });
}

function openCartDrawer(trigger = document.activeElement, options = {}) {
  renderCart();
  setCartStep("items");
  lastCartTrigger = trigger instanceof HTMLElement ? trigger : null;
  dom.cartView.inert = false;
  dom.cartView.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  document.body.classList.remove("nav-open");
  window.setTimeout(() => dom.closeCartDrawer.focus({ preventScroll: true }), 30);
  if (options.history !== false) {
    pushPortalRoute("/cart", {
      modal: "cart",
      parent: `${window.location.pathname}${window.location.search}`,
    });
  }
}

function closeCartDrawer(options = {}) {
  const wasOpen = document.body.classList.contains("cart-open");
  document.body.classList.remove("cart-open");
  dom.cartView.setAttribute("aria-hidden", "true");
  dom.cartView.inert = true;
  if (wasOpen) restoreFocus(lastCartTrigger);
  if (wasOpen && options.history !== false && window.location.pathname === "/cart") {
    if (window.history.state?.blackmarketPortal?.parent) {
      window.history.back();
    } else {
      window.history.replaceState({ blackmarketPortal: { view: "products" } }, "", "/products");
      setView("products", { history: false });
    }
  }
}

function trapCartFocus(event) {
  const focusable = [...dom.cartView.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]")]
    .filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function restoreFocus(element) {
  if (!element?.isConnected) return;
  window.requestAnimationFrame(() => element.focus({ preventScroll: true }));
}

function storeData() {
  return Object.fromEntries(new FormData(dom.storeForm).entries());
}

function hydrateStoreForm() {
  const data = loadJson(STORE_KEY, {});
  Object.entries(data).forEach(([key, value]) => {
    const field = dom.storeForm.elements[key];
    if (field) field.value = value;
  });
}

function saveStoreForm() {
  saveJson(STORE_KEY, storeData());
}

async function sendOrder() {
  if (dom.sendOrder.disabled) {
    showToast("Complete the cart and store information");
    return;
  }
  const previous = dom.sendOrder.textContent;
  dom.sendOrder.disabled = true;
  dom.sendOrder.textContent = "Submitting...";
  const lines = cartLines();
  let order;
  try {
    order = await previewOrder(buildClientOrder(lines));
  } catch (error) {
    showToast(error?.message || "Order pricing could not be verified");
    dom.sendOrder.textContent = previous;
    updateOrderState();
    return;
  }

  try {
    const result = await sendOrderToServer(order);
    state.orderStorageMode = result.storage || state.orderStorageMode;
    const savedOrder = result.order || order;
    state.orders = [savedOrder, ...state.orders.filter((entry) => entry.id !== savedOrder.id)].slice(0, 500);
    saveJson(ORDERS_KEY, state.orders);
    state.cart = {};
    localStorage.removeItem(CART_KEY);
    renderCart();
    renderAdminOrders();
    closeCartDrawer();
    await showSubmittedOrderOptions(savedOrder);
    showToast(
      result.storage === "vercel blob"
        ? "Order request received and cart cleared"
        : "Order received; cloud inbox storage is temporarily offline",
    );
  } catch (error) {
    showToast(error?.message || "Order could not be sent");
  } finally {
    dom.sendOrder.textContent = previous;
    updateOrderState();
  }
}

async function previewOrder(order) {
  const response = await fetch("/api/order-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(order),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !result.order) throw new Error(result.message || "Order pricing could not be verified");
  return result.order;
}

function buildClientOrder(lines = cartLines()) {
  return {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    store: storeData(),
    lines: lines.map(publicLine),
    totals: cartTotals(lines),
  };
}

async function showSubmittedOrderOptions(order) {
  const previewLines = (order.lines || []).slice(0, 4).map((line) => `
    <div class="order-confirmation-line">
      <span class="order-confirmation-thumb">${line.image ? `<img src="${escapeHtml(line.image)}" alt="" width="52" height="52" loading="lazy" />` : "BM"}</span>
      <span><strong>${escapeHtml(line.product)}</strong><small>${escapeHtml(line.flavor)} · SKU ${escapeHtml(line.item)}</small></span>
      <span class="order-confirmation-margin"><small>Margin</small><strong>${escapeHtml(formatOrderLineMargin(line))}</strong></span>
      <span class="order-confirmation-quantity"><small>Qty</small><strong>${escapeHtml(String(line.qty))}</strong></span>
      <strong>${money(line.lineWholesale)}</strong>
    </div>
  `).join("");
  dom.orderDownloadSummary.innerHTML = `
    <header class="order-confirmation-head"><span>BLACKMARKET <em>Wholesale</em></span><strong>Order Confirmation</strong></header>
    <div class="order-confirmation-meta"><span><small>Store</small><strong>${escapeHtml(order.store.storeName || "Store order")}</strong></span><span><small>Order</small><strong>${escapeHtml(order.id)}</strong></span><span><small>Units</small><strong>${order.totals.units}</strong></span></div>
    <div class="order-confirmation-lines">${previewLines}${order.lines.length > 4 ? `<p>+ ${order.lines.length - 4} more item${order.lines.length - 4 === 1 ? "" : "s"}</p>` : ""}</div>
    <div class="order-confirmation-total"><span>Total</span><strong>${money(order.totals.grandTotal ?? order.totals.wholesale)}</strong></div>
  `;

  return new Promise((resolve) => {
    const finish = (download) => {
      dom.downloadOrderCopy.removeEventListener("click", onDownload);
      dom.sendWithoutDownload.removeEventListener("click", onSendOnly);
      dom.cancelOrderSend.removeEventListener("click", onCancel);
      dom.orderDownloadModal.removeEventListener("cancel", onDialogCancel);
      if (download) downloadOrder(order);
      closeOrderDownloadModal();
      resolve();
    };
    const onDownload = () => finish(true);
    const onSendOnly = () => finish(false);
    const onCancel = () => finish(false);
    const onDialogCancel = (event) => {
      event.preventDefault();
      finish(false);
    };

    dom.downloadOrderCopy.addEventListener("click", onDownload);
    dom.sendWithoutDownload.addEventListener("click", onSendOnly);
    dom.cancelOrderSend.addEventListener("click", onCancel);
    dom.orderDownloadModal.addEventListener("cancel", onDialogCancel);
    showDialog(dom.orderDownloadModal);
  });
}

async function sendOrderToServer(order) {
  const response = await fetch(ORDER_SUBMIT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Order could not be sent");
  }
  return body;
}

async function downloadOrder(order) {
  try {
    const response = await fetch("/api/order-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(order),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || "PDF download failed");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blackmarket-order-${safeFilePart(order.store.storeName)}-${today()}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showToast(error?.message || "PDF download failed");
  }
}

function generateOrderPdf(order) {
  const pages = buildOrderPdfPages(order);
  return buildPdfFile(pages);
}

function buildOrderPdfPages(order) {
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const pages = [];
  let index = 0;

  while (index < lines.length || !pages.length) {
    const ops = [];
    drawOrderPageHeader(ops, order);
    const pageStart = index;
    let y = drawOrderItemHeader(ops);

    while (index < lines.length) {
      const row = orderLineForPdf(lines[index], index);
      const descLines = wrapPdfText(row.description, 160, 9);
      const rowHeight = Math.max(24, 12 + descLines.length * 11);
      if (y - rowHeight < 58 && index > pageStart) break;
      drawOrderItemRow(ops, row, descLines, y, rowHeight, index);
      y -= rowHeight;
      index += 1;
    }

    pages.push(ops);
    if (index >= lines.length && y < 156) {
      const totalsPage = [];
      drawOrderPageHeader(totalsPage, order);
      pages.push(totalsPage);
    }
  }

  drawOrderTermsAndTotals(pages[pages.length - 1], order);
  pages.forEach((ops, pageIndex) => drawOrderFooter(ops, order, pageIndex + 1, pages.length));
  return pages.map((ops) => ops.join("\n"));
}

function drawOrderPageHeader(ops, order) {
  const store = order.store || {};
  const addressLines = orderAddressLines(store);

  pdfText(ops, "Invoice", 306, 746, { size: 18, bold: true, align: "center" });

  const billLines = [
    store.storeName || "Store order",
    store.street || "",
    pdfCityStateZip(store),
    `Email: ${store.email || ""}`,
  ].filter(Boolean);
  const shipLines = [store.storeName || "Store order", ...addressLines].filter(Boolean);

  pdfLabeledBox(ops, 30, 618, 275, 78, "Bill To:", billLines);
  pdfLabeledBox(ops, 315, 632, 267, 64, "Ship To:", shipLines);
  pdfRect(ops, 315, 614, 267, 16);
  pdfText(ops, `Contact: ${store.contactName || store.storeName || ""}`, 319, 618, { size: 10.5 });
  pdfRect(ops, 30, 600, 275, 16);
  pdfText(ops, `Customer: ${store.storeName || ""}`, 34, 604, { size: 10.5 });

  pdfTable(ops, 30, 562, [94, 94, 94, 94, 94, 82], 30, [
    ["Sales Rep", "Payment Terms", "FOB Point", "Carrier", "Ship Service", "Date Scheduled"],
    ["pmart", "Due on Order", "Origin", "FedEx - 6278-0", "Ground", shortPdfDate(order.date)],
  ]);
}

function drawOrderItemHeader(ops) {
  const x = 30;
  const y = 528;
  const widths = [30, 44, 86, 174, 74, 64, 80];
  const headers = ["Item\n#", "Type", "Number", "Description", "Unit Price", "Qty\nOrdered", "Total Price"];
  pdfSetGray(ops, 0.88);
  pdfFillRect(ops, x, y, widths.reduce((total, width) => total + width, 0), 28);
  pdfSetGray(ops, 0);
  pdfLine(ops, x, y, x + widths.reduce((total, width) => total + width, 0), y);
  let cx = x;
  headers.forEach((header, i) => {
    if (i > 0) pdfLine(ops, cx, y, cx, y + 28, { color: 1 });
    const parts = header.split("\n");
    parts.forEach((part, lineIndex) => {
      const align = i >= 4 ? "right" : i === 0 || i === 1 || i === 5 ? "center" : "left";
      const tx = align === "right" ? cx + widths[i] - 4 : align === "center" ? cx + widths[i] / 2 : cx + 4;
      pdfText(ops, part, tx, y + 17 - lineIndex * 11, { size: 10, bold: true, align });
    });
    cx += widths[i];
  });
  return y - 2;
}

function drawOrderItemRow(ops, row, descLines, y, height, index) {
  const x = 30;
  const widths = [30, 44, 86, 174, 74, 64, 80];
  if (index % 2 === 1) {
    pdfSetGray(ops, 0.91);
    pdfFillRect(ops, x, y - height + 2, widths.reduce((total, width) => total + width, 0), height);
    pdfSetGray(ops, 0);
  }
  let cx = x;
  const cells = [
    { text: String(row.index), align: "center", bold: false },
    { text: "Sale", align: "center", bold: false },
    { text: row.item, align: "left", bold: false },
    { lines: descLines, align: "left", bold: false },
    { text: row.unitPrice, align: "right", bold: false },
    { text: row.qty, align: "right", bold: false },
    { text: row.total, align: "right", bold: false },
  ];

  cells.forEach((cell, i) => {
    const baseline = y - 12;
    if (i === 3) {
      cell.lines.forEach((line, lineIndex) => pdfText(ops, line, cx + 4, baseline - lineIndex * 11, { size: 9 }));
    } else {
      const align = cell.align;
      const tx = align === "right" ? cx + widths[i] - 4 : align === "center" ? cx + widths[i] / 2 : cx + 4;
      pdfText(ops, cell.text, tx, baseline, { size: 9.5, align, bold: cell.bold });
    }
    cx += widths[i];
  });
}

function drawOrderTermsAndTotals(ops, order) {
  const terms = [
    "Terms and Conditions",
    "1. Actual amount will be +/- 10% based on qty produced,",
    "2. Insufficient or incorrect addresses will be subject to return shipping costs",
    "3. This order is subject to BlackMarket's return and refund policy which can be",
    "found",
    "4. here: blackmarketlabs.com/pages/return-policy",
    "5.",
    "6.",
    "7.",
    "8.",
    "9.",
  ];
  let termY = 124;
  terms.forEach((line, i) => {
    const termLines = i === 0 ? [line] : wrapPdfText(line, 330, 8);
    termLines.forEach((termLine) => {
      pdfText(ops, termLine, 30, termY, { size: i === 0 ? 8.5 : 8 });
      termY -= 10;
    });
  });

  const totals = order.totals || {};
  const total = Number(totals.wholesale || 0);
  const rows = [
    ["Subtotal:", money(total)],
    ["Sales Tax:", money(0)],
    ["Total:", money(total)],
    ["Paid:", money(0)],
    ["Balance Due:", money(total)],
  ];
  const x = 370;
  let y = 110;
  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      pdfSetGray(ops, 0.88);
      pdfFillRect(ops, x, y - 3, 212, 14);
      pdfSetGray(ops, 0);
    }
    pdfText(ops, row[0], x + 68, y, { size: 10, bold: true, align: "right" });
    pdfText(ops, row[1], x + 208, y, { size: 10, bold: true, align: "right" });
    y -= 14;
  });
}

function drawOrderFooter(ops, order, page, totalPages) {
  pdfText(ops, pdfDateTime(order.date), 30, 22, { size: 9 });
  pdfText(ops, "Revision: 4", 306, 22, { size: 9, align: "center" });
  pdfText(ops, `Page ${page} of ${totalPages}`, 582, 22, { size: 9, align: "right" });
}

function orderLineForPdf(line, index) {
  return {
    index: index + 1,
    item: line.item || "",
    description: `${line.product || ""} ${line.flavor || ""}`.trim(),
    unitPrice: line.wholesale || money(0),
    qty: `${line.qty || 0} ea`,
    total: money(line.lineWholesale || 0),
  };
}

function orderAddressLines(store = {}) {
  return [store.street, pdfCityStateZip(store)].filter(Boolean);
}

function pdfCityStateZip(store = {}) {
  const city = store.city ? `${store.city},` : "";
  return [city, store.state, store.zip].filter(Boolean).join(" ");
}

function shortPdfDate(dateValue) {
  const date = new Date(dateValue || Date.now());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function pdfDateTime(dateValue) {
  const date = new Date(dateValue || Date.now());
  const day = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).replace(" AM", "AM").replace(" PM", "PM");
  return `${day}, ${time}`;
}

function pdfLabeledBox(ops, x, y, width, height, label, lines) {
  pdfRect(ops, x, y, width, height);
  pdfSetGray(ops, 0.9);
  pdfFillRect(ops, x, y + height - 17, width, 17);
  pdfSetGray(ops, 0);
  pdfLine(ops, x, y + height - 17, x + width, y + height - 17);
  pdfText(ops, label, x + 4, y + height - 12, { size: 10.5, bold: true });
  lines.forEach((line, index) => pdfText(ops, line, x + 4, y + height - 32 - index * 13, { size: 10.5 }));
}

function pdfTable(ops, x, y, widths, height, rows) {
  const rowHeight = height / rows.length;
  const totalWidth = widths.reduce((total, width) => total + width, 0);
  rows.forEach((row, rowIndex) => {
    const ry = y + height - rowHeight * (rowIndex + 1);
    if (rowIndex === 0) {
      pdfSetGray(ops, 0.9);
      pdfFillRect(ops, x, ry, totalWidth, rowHeight);
      pdfSetGray(ops, 0);
    }
    pdfRect(ops, x, ry, totalWidth, rowHeight);
    let cx = x;
    row.forEach((cell, colIndex) => {
      if (colIndex > 0) pdfLine(ops, cx, ry, cx, ry + rowHeight);
      pdfText(ops, cell, cx + widths[colIndex] / 2, ry + rowHeight / 2 - 4, {
        size: 10,
        bold: rowIndex === 0,
        align: "center",
      });
      cx += widths[colIndex];
    });
  });
}

function wrapPdfText(text, width, size) {
  const clean = sanitizePdfText(text);
  const maxChars = Math.max(12, Math.floor(width / (size * 0.5)));
  const words = clean.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pdfText(ops, text, x, y, options = {}) {
  const size = options.size || 10;
  const font = options.bold ? "F2" : "F1";
  const value = sanitizePdfText(text);
  const tracking = options.tracking || 0;
  let tx = x;
  if (options.align === "right") tx -= pdfApproxTextWidth(value, size, tracking);
  if (options.align === "center") tx -= pdfApproxTextWidth(value, size, tracking) / 2;
  ops.push(`BT /${font} ${pdfNum(size)} Tf ${pdfNum(tracking)} Tc ${pdfNum(tx)} ${pdfNum(y)} Td (${escapePdfString(value)}) Tj ET`);
}

function pdfApproxTextWidth(text, size, tracking = 0) {
  return text.length * size * 0.52 + Math.max(0, text.length - 1) * tracking;
}

function sanitizePdfText(text) {
  return String(text ?? "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function escapePdfString(text) {
  return sanitizePdfText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfRect(ops, x, y, width, height) {
  ops.push(`0 G 0.5 w ${pdfNum(x)} ${pdfNum(y)} ${pdfNum(width)} ${pdfNum(height)} re S`);
}

function pdfLine(ops, x1, y1, x2, y2, options = {}) {
  const color = options.color ?? 0;
  ops.push(`${pdfNum(color)} G 0.5 w ${pdfNum(x1)} ${pdfNum(y1)} m ${pdfNum(x2)} ${pdfNum(y2)} l S`);
}

function pdfFillRect(ops, x, y, width, height) {
  ops.push(`${pdfNum(x)} ${pdfNum(y)} ${pdfNum(width)} ${pdfNum(height)} re f`);
}

function pdfSetGray(ops, gray) {
  ops.push(`${pdfNum(gray)} g ${pdfNum(gray)} G`);
}

function pdfNum(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function buildPdfFile(pageContents) {
  const encoder = new TextEncoder();
  const objects = [];
  const pageObjectNumbers = pageContents.map((_, index) => 5 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(" ")}] /Count ${pageContents.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pageContents.forEach((content, index) => {
    const pageNum = pageObjectNumbers[index];
    const contentNum = pageNum + 1;
    const bytes = encoder.encode(content);
    objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum] = `<< /Length ${bytes.length} >>\nstream\n${content}\nendstream`;
  });

  const parts = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = encoder.encode(parts.join("")).length;
    parts.push(`${i} 0 obj\n${objects[i]}\nendobj\n`);
  }
  const xrefOffset = encoder.encode(parts.join("")).length;
  parts.push(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < objects.length; i += 1) {
    parts.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return encoder.encode(parts.join(""));
}

async function copyOrderEmail(order) {
  const email = order.store?.email || "";
  if (!email) {
    showToast("No customer email on this order");
    return;
  }
  await copyText(email);
  showToast("Customer email copied");
}

async function copyOrderSummary(order) {
  await copyText(formatOrderForDownload(order));
  showToast("Order summary copied");
}

async function copyOrderEmailDraft(order) {
  await copyText(formatCustomerEmailDraft(order));
  showToast("Email draft copied");
}

function formatOrderForDownload(order) {
  const store = order.store || {};
  const lines = order.lines || [];
  return [
    "BLACKMARKET Wholesale Order",
    `Order ID: ${order.id}`,
    `Date: ${new Date(order.date).toLocaleString()}`,
    "",
    "Store",
    `Store: ${store.storeName || ""}`,
    `Contact: ${store.contactName || ""}`,
    `Phone: ${store.phone || ""}`,
    `Email: ${store.email || ""}`,
    `Address: ${[store.street, store.city, store.state, store.zip].filter(Boolean).join(", ")}`,
    store.notes ? `Notes: ${store.notes}` : "",
    "",
    "Items",
    ...lines.map((line) => `${line.qty} x ${line.product} ${line.flavor} / #${line.item} / ${line.wholesale} = ${money(line.lineWholesale)}`),
    "",
    `Units: ${order.totals?.units || 0}`,
    `Wholesale total: ${money(order.totals?.wholesale || 0)}`,
    `Projected MAP value: ${money(order.totals?.map || 0)}`,
  ].filter((line) => line !== "").join("\n");
}

function formatCustomerEmailDraft(order) {
  const store = order.store || {};
  return [
    `To: ${store.email || ""}`,
    `Subject: BLACKMARKET Wholesale Order Request Received - ${store.storeName || "Wholesale Order"}`,
    "",
    `Hi ${store.contactName || store.storeName || "there"},`,
    "",
    "We received your BLACKMARKET Wholesale order request. Here is the order summary for review:",
    "",
    formatOrderForDownload(order),
    "",
    "We will review availability and follow up with next steps.",
    "",
    "BLACKMARKET Wholesale",
  ].join("\n");
}

function publicLine({ item, qty, lineWholesale, lineMap }) {
  return {
    variantId: item.id,
    productId: item.productId,
    product: item.productTitle,
    flavor: item.flavor,
    item: item.item,
    upc: item.upc,
    image: item.bottle,
    wholesale: item.wholesale,
    map: item.map,
    standardWholesale: item.standardWholesaleValue,
    customPriceApplied: Boolean(item.customPriceApplied),
    qty,
    lineWholesale,
    lineMap,
  };
}

async function loadServerOrders(options = {}) {
  if (!state.adminAuthed) return;
  try {
    const response = await fetch(ORDERS_API_URL, { cache: "no-store", headers: adminHeaders() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to load orders");
    const nextOrders = Array.isArray(body.orders) ? body.orders : [];
    updateAdminOrderNotifications(nextOrders, options);
    state.orders = nextOrders;
    state.orderStorageMode = body.storage || "server";
    saveJson(ORDERS_KEY, state.orders);
    renderAdminOrders();
    renderAdminMetrics();
    if (!options.silent) showToast("Order inbox refreshed");
  } catch (error) {
    state.orderStorageMode = "local fallback";
    renderAdminMetrics();
    if (!options.silent) showToast(error?.message || "Unable to refresh orders");
  }
}

function adminLastSeenKey() {
  return `bm_admin_last_order_${state.adminIdentity?.username || "admin"}`;
}

function updateAdminOrderNotifications(orders, options = {}) {
  const newest = orders.reduce((latest, order) => Math.max(latest, Date.parse(order.date) || 0), 0);
  const stored = Number(localStorage.getItem(adminLastSeenKey()) || 0);
  const unread = orders.filter((order) => (Date.parse(order.date) || 0) > stored);
  state.adminUnreadOrders = unread.length;
  renderAdminNotificationBell();
  if (options.initial) {
    state.adminNotifiedThrough = newest;
    return;
  }
  const unnotified = unread.filter((order) => (Date.parse(order.date) || 0) > state.adminNotifiedThrough);
  if (unnotified.length && options.notify) {
    state.adminNotifiedThrough = Math.max(state.adminNotifiedThrough, ...unnotified.map((order) => Date.parse(order.date) || 0));
  }
}

function markAdminOrdersRead() {
  const newest = state.orders.reduce((latest, order) => Math.max(latest, Date.parse(order.date) || 0), Date.now());
  localStorage.setItem(adminLastSeenKey(), String(newest));
  state.adminUnreadOrders = 0;
  renderAdminNotificationBell();
}

function renderAdminNotificationBell() {
  if (!dom.adminNotificationBell) return;
  dom.adminNotificationBell.hidden = !state.adminAuthed;
  dom.adminNotificationBell.classList.toggle("has-unread", state.adminUnreadOrders > 0);
  if (dom.adminNotificationCount) {
    dom.adminNotificationCount.hidden = state.adminUnreadOrders < 1;
    dom.adminNotificationCount.textContent = state.adminUnreadOrders > 99 ? "99+" : String(state.adminUnreadOrders);
  }
}

function startAdminOrderPolling() {
  stopAdminOrderPolling();
  if (!state.adminAuthed) return;
  state.adminPollTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") loadServerOrders({ silent: true, notify: true });
  }, 30_000);
}

function stopAdminOrderPolling() {
  if (state.adminPollTimer) window.clearInterval(state.adminPollTimer);
  state.adminPollTimer = null;
}

function isInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

async function notifyAdminOfOrders(orders) {
  if (!isInstalledApp() || !("Notification" in window) || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  const first = orders[0];
  const title = orders.length === 1 ? "New wholesale order" : `${orders.length} new wholesale orders`;
  const body = orders.length === 1 ? `${first.store?.storeName || "A store"} submitted an order.` : "Open the admin order inbox to review them.";
  if (registration?.showNotification) await registration.showNotification(title, { body, icon: "/icon-192.png", badge: "/favicon.png", tag: "blackmarket-new-orders", data: { url: "/admin" } });
}

async function clearServerOrders() {
  try {
    const response = await fetch(ORDERS_API_URL, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to clear orders");
    state.orders = [];
    updateAdminOrderNotifications(state.orders, { initial: true });
    saveJson(ORDERS_KEY, state.orders);
    renderAdminOrders();
    renderAdminMetrics();
    showToast("Order inbox cleared");
  } catch (error) {
    showToast(error?.message || "Unable to clear orders");
  }
}

async function deleteServerOrder(id) {
  if (!id) return;
  const order = state.orders.find((entry) => entry.id === id);
  const label = order?.store?.storeName || "this order";
  if (!window.confirm(`Delete ${label} from the admin inbox?`)) return;
  try {
    const response = await fetch(`${ORDERS_API_URL}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to delete order");
    state.orders = state.orders.filter((entry) => entry.id !== id);
    updateAdminOrderNotifications(state.orders, { initial: true });
    saveJson(ORDERS_KEY, state.orders);
    renderAdminOrders();
    renderAdminMetrics();
    showToast("Order deleted");
  } catch (error) {
    showToast(error?.message || "Unable to delete order");
  }
}

function applyServerContent(content) {
  if (!content || typeof content !== "object") return false;
  if (Array.isArray(content.hiddenVariants)) {
    state.site = { ...state.site, hiddenVariants: unique(content.hiddenVariants.map(String)) };
    saveJson(SITE_KEY, state.site);
  }
  if (content.variantOverrides && typeof content.variantOverrides === "object" && !Array.isArray(content.variantOverrides)) {
    state.site = { ...state.site, variantOverrides: cleanVariantOverrides(content.variantOverrides) };
    saveJson(SITE_KEY, state.site);
  }
  if (Array.isArray(content.announcements)) {
    state.site = { ...state.site, announcements: content.announcements };
    saveJson(SITE_KEY, state.site);
  }
  if (Array.isArray(content.customProducts)) {
    state.customProducts = content.customProducts;
    saveJson(CUSTOM_PRODUCTS_KEY, state.customProducts);
  }
  return true;
}

async function loadServerContent(options = {}) {
  try {
    const response = await fetch(CONTENT_API_URL, {
      cache: "no-store",
      headers: state.adminAuthed ? adminHeaders() : {},
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to load portal content");
    state.contentStorageMode = body.storage || "server";
    if (body.content) applyServerContent(body.content);
    rebuildProductState();
    renderAnnouncements();
    renderNews();
    renderAdmin();
    if (!options.silent) showToast("Portal content refreshed");
    return true;
  } catch (error) {
    state.contentStorageMode = "local fallback";
    renderAdminMetrics();
    if (!options.silent) showToast(error?.message || "Unable to refresh portal content");
    return false;
  }
}

async function persistAdminContent(options = {}) {
  if (!state.adminAuthed) return false;
  try {
    const response = await fetch(CONTENT_API_URL, {
      method: "PUT",
      headers: {
        ...adminHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        announcements: state.site.announcements,
        hiddenVariants: hiddenVariantIds(),
        variantOverrides: variantOverrides(),
        customProducts: state.customProducts,
        ...(options.notificationAnnouncementId
          ? { notificationAnnouncementId: options.notificationAnnouncementId }
          : {}),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to save portal content");
    state.contentStorageMode = body.storage || "server";
    renderAdminMetrics();
    if (!options.silent) showToast("Portal content saved");
    return true;
  } catch (error) {
    state.contentStorageMode = "local fallback";
    renderAdminMetrics();
    if (!options.silent) showToast(error?.message || "Saved locally; cloud sync is unavailable");
    return false;
  }
}

function adminHeaders() {
  return {};
}

function openNewsEditor(options = {}) {
  if (options.reset) clearAnnouncementEditor();
  dom.announcementForm.inert = false;
  dom.announcementForm.setAttribute("aria-hidden", "false");
  dom.adminNewsSide.inert = false;
  document.body.classList.add("admin-news-editing");
  document.body.classList.remove("admin-product-editing");
  window.requestAnimationFrame(() => dom.announcementTitle.focus());
}

function closeNewsEditor() {
  document.body.classList.remove("admin-news-editing");
  dom.announcementForm.inert = true;
  dom.announcementForm.setAttribute("aria-hidden", "true");
  dom.adminNewsSide.inert = true;
}

function openProductEditor(mode = "flavor", parentId = "") {
  dom.customProductForm.reset();
  setProductEditorMode(mode);
  if (mode === "flavor") {
    dom.customProductParent.value = parentId || "defy-hyper-stimulant";
    syncProductEditorFromParent();
  }
  dom.customProductForm.inert = false;
  dom.customProductForm.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-product-editing");
  document.body.classList.remove("admin-news-editing");
  window.requestAnimationFrame(() => {
    const target = mode === "flavor" ? dom.customProductFlavor : dom.customProductTitle;
    target.focus();
  });
}

function closeProductEditor() {
  document.body.classList.remove("admin-product-editing");
  dom.customProductForm.inert = true;
  dom.customProductForm.setAttribute("aria-hidden", "true");
}

function closeAdminEditors() {
  closeNewsEditor();
  closeProductEditor();
}

function renderAdmin() {
  dom.adminLoginForm.hidden = state.adminAuthed;
  dom.adminPanel.hidden = !state.adminAuthed;
  if (!state.adminAuthed) closeAdminEditors();
  if (dom.adminIdentityLabel) {
    dom.adminIdentityLabel.hidden = !state.adminAuthed;
    dom.adminIdentityLabel.textContent = state.adminIdentity ? `${state.adminIdentity.displayName} · ${state.adminIdentity.scope === "all" ? "All orders" : "My orders"}` : "Admin";
  }
  const createSalesperson = dom.adminCreateAccountForm?.elements?.salesperson;
  if (createSalesperson && state.adminIdentity) {
    createSalesperson.disabled = state.adminIdentity.scope === "own";
    if (state.adminIdentity.scope === "own") createSalesperson.value = state.adminIdentity.salesperson;
  }
  renderAdminNotificationBell();
  renderAdminPages();
  renderAdminMetrics();
  renderAdminNews();
  renderAdminNewsPreview();
  renderAdminOrders();
  renderAdminProducts();
  renderProductEditor();
}

function setAdminSection(section) {
  closeAdminEditors();
  state.activeAdminSection = ADMIN_SECTIONS.has(section) ? section : "orders";
  renderAdminPages();
  if (state.activeAdminSection === "orders") loadServerOrders({ silent: true });
  if (state.activeAdminSection === "stores") loadAdminAccounts({ silent: true });
}

async function loadAdminAccounts(options = {}) {
  if (!state.adminAuthed) return false;
  try {
    const response = await fetch("/api/admin/accounts", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || "Unable to load store accounts");
    state.adminAccounts = Array.isArray(result.accounts) ? result.accounts : [];
    state.adminAccountOrders = Array.isArray(result.orders) ? result.orders : [];
    state.adminPricingCatalog = Array.isArray(result.catalog) ? result.catalog : [];
    renderAdminStoreAccounts();
    if (!options.silent) showToast("Store accounts refreshed");
    return true;
  } catch (error) {
    if (!options.silent) showToast(error?.message || "Unable to load store accounts");
    return false;
  }
}

async function createAdminStoreAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const response = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || "Unable to create store account");
    form.reset();
    await loadAdminAccounts({ silent: true });
    showToast("Store account created");
  } catch (error) {
    showToast(error?.message || "Unable to create store account");
  } finally {
    submit.disabled = false;
  }
}

async function handleAdminStoreAction(event) {
  const button = event.target.closest("[data-store-action]");
  if (!button) return;
  const card = button.closest("[data-account-id]");
  const accountId = card?.dataset.accountId;
  const account = state.adminAccounts.find((entry) => entry.id === accountId);
  if (!account) return;
  const action = button.dataset.storeAction;
  const payload = { accountId, action };

  if (action === "status") payload.status = button.dataset.status;
  if (action === "reset-password") {
    const password = window.prompt(`Set a new temporary password for @${account.username}. The old password cannot be recovered.`);
    if (!password) return;
    payload.password = password;
  }
  if (action === "username") {
    const username = window.prompt("New username", account.username);
    if (!username || username === account.username) return;
    payload.username = username;
  }
  if (action === "store") {
    const storeName = window.prompt("Store name", account.store?.storeName || "");
    if (!storeName) return;
    const contactName = window.prompt("Contact name", account.store?.contactName || "") ?? account.store?.contactName;
    const email = window.prompt("Email", account.email || "") ?? account.email;
    const salesperson = state.adminIdentity?.scope === "own"
      ? state.adminIdentity.salesperson
      : window.prompt("Salesperson: parker, matt, or beau", account.store?.salesperson || "parker")?.trim().toLowerCase();
    if (!salesperson || !["parker", "matt", "beau"].includes(salesperson)) return showToast("Enter Parker, Matt, or Beau");
    Object.assign(payload, { storeName, contactName, email, salesperson, phone: account.store?.phone || "", street: account.store?.street || "", city: account.store?.city || "", state: account.store?.state || "", zip: account.store?.zip || "" });
  }
  if (action === "add-price") {
    const select = card.querySelector("[data-price-target]");
    const input = card.querySelector("[data-price-value]");
    const [scope, id] = String(select?.value || "").split(":");
    if (!id) return showToast("Select a product");
    if (scope === "variant") payload.variantId = id;
    else payload.productId = id;
    payload.wholesalePrice = Number(input?.value);
  }
  if (action === "remove-price") payload.overrideId = button.dataset.overrideId;
  if (action === "link-order") {
    const select = card.querySelector("[data-order-target]");
    if (!select?.value) return showToast("Select an order");
    payload.orderId = select.value;
  }

  button.disabled = true;
  try {
    const response = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || "Account update failed");
    await loadAdminAccounts({ silent: true });
    if (action === "link-order") await loadServerOrders({ silent: true });
    showToast("Store account updated");
  } catch (error) {
    showToast(error?.message || "Account update failed");
  } finally {
    button.disabled = false;
  }
}

function renderAdminStoreAccounts() {
  if (!dom.adminStoreAccounts || !state.adminAuthed) return;
  const query = state.adminAccountQuery;
  const accounts = state.adminAccounts.filter((account) => {
    const matchesStatus = state.adminAccountStatus === "all" || account.status === state.adminAccountStatus;
    const haystack = `${account.store?.storeName || ""} ${account.username || ""} ${account.email || ""}`.toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
  if (!accounts.length) {
    dom.adminStoreAccounts.innerHTML = `<div class="empty-state">No matching store accounts.</div>`;
    return;
  }

  const productOptions = unique(state.adminPricingCatalog.map((item) => item.productId)).map((productId) => {
    const item = state.adminPricingCatalog.find((entry) => entry.productId === productId);
    return `<option value="product:${escapeHtml(productId)}">${escapeHtml(item?.product || productId)} — all variants</option>`;
  }).join("");

  dom.adminStoreAccounts.innerHTML = accounts.map((account) => {
    const unlinkedOrders = state.adminAccountOrders.filter((order) => !order.storeId || order.storeId === account.storeId);
    const orderOptions = unlinkedOrders.map((order) => `<option value="${escapeHtml(order.id)}">${escapeHtml(order.storeName || order.id)} · ${escapeHtml(order.id)}</option>`).join("");
    const overrides = (account.priceOverrides || []).map((override) => {
      const item = state.adminPricingCatalog.find((entry) => override.variantId ? entry.variantId === override.variantId : entry.productId === override.productId);
      return `<li><span>${escapeHtml(item ? `${item.product}${override.variantId ? ` / ${item.flavor}` : ""}` : override.variantId || override.productId)} <strong>${money(override.wholesalePrice)}</strong></span><button type="button" data-store-action="remove-price" data-override-id="${escapeHtml(override.id)}">Remove</button></li>`;
    }).join("");
    return `
      <article class="admin-card admin-store-account" data-account-id="${escapeHtml(account.id)}">
        <div class="admin-store-account-head">
          <div><span class="admin-kicker">@${escapeHtml(account.username)}</span><h3>${escapeHtml(account.store?.storeName || "Store")}</h3><p>${escapeHtml(account.email || "")} · Created ${escapeHtml(shortDate(account.createdAt))}</p></div>
          <span class="admin-account-status is-${escapeHtml(account.status)}">${escapeHtml(account.status)}</span>
        </div>
        <div class="admin-actions admin-store-actions">
          ${account.status !== "active" ? `<button class="admin-button admin-primary" type="button" data-store-action="status" data-status="active">Enable</button>` : ""}
          ${account.status !== "disabled" ? `<button class="admin-button admin-secondary" type="button" data-store-action="status" data-status="disabled">Disable</button>` : ""}
          <button class="admin-button admin-secondary" type="button" data-store-action="store">Edit Store</button>
          <button class="admin-button admin-secondary" type="button" data-store-action="username">Change Username</button>
          <button class="admin-button admin-secondary" type="button" data-store-action="reset-password">Reset Password</button>
        </div>
        <div class="admin-store-meta"><span>Salesperson <strong>${escapeHtml((account.store?.salesperson || "parker").replace(/^./, (letter) => letter.toUpperCase()))}</strong></span><span>Last login <strong>${account.lastLoginAt ? escapeHtml(shortDate(account.lastLoginAt)) : "Never"}</strong></span><span>Product prices <strong>${account.priceOverrides?.length || 0}</strong></span></div>
        <div class="admin-store-control"><label><span>Product</span><select data-price-target><option value="">Select a product</option>${productOptions}</select></label><label><span>Wholesale price</span><input data-price-value type="number" min="0" step="0.01" placeholder="0.00" /></label><button class="admin-button admin-primary" type="button" data-store-action="add-price">Set Product Price</button></div>
        <ul class="admin-price-overrides">${overrides || "<li><span>No product prices set.</span></li>"}</ul>
        <div class="admin-store-control admin-order-link"><label><span>Historical order</span><select data-order-target><option value="">Select order</option>${orderOptions}</select></label><button class="admin-button admin-secondary" type="button" data-store-action="link-order">Link Order</button></div>
      </article>
    `;
  }).join("");
}

function renderAdminPages() {
  dom.adminSectionNav?.querySelectorAll("[data-admin-section]").forEach((button) => {
    const active = button.dataset.adminSection === state.activeAdminSection;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  if (dom.adminPanel) dom.adminPanel.dataset.activeAdminPage = state.activeAdminSection;
  dom.adminPages.forEach((page) => {
    const active = page.dataset.adminPage === state.activeAdminSection;
    page.classList.toggle("active", active);
    page.hidden = !active;
  });
}

function renderAdminMetrics() {
  if (!state.adminAuthed) return;
  const revenue = state.orders.reduce((total, order) => total + Number(order.totals?.wholesale || 0), 0);
  if (dom.adminOrderCount) dom.adminOrderCount.textContent = String(state.orders.length);
  if (dom.adminOrderRevenue) dom.adminOrderRevenue.textContent = money(revenue);
  if (dom.adminProductCount) dom.adminProductCount.textContent = String(state.products.length);
  if (dom.adminNewsCount) dom.adminNewsCount.textContent = String(state.site.announcements.length);
  if (dom.adminStorageMode) dom.adminStorageMode.value = `${state.orderStorageMode} inbox`;
  if (dom.adminContentStorageMode) dom.adminContentStorageMode.value = `${state.contentStorageMode} content`;
  renderStorageStatus(dom.adminOrderStorageStatus, state.orderStorageMode, "Orders");
  renderStorageStatus(dom.adminContentStorageStatus, state.contentStorageMode, "Content");
  if (dom.adminCatalogProductCount) dom.adminCatalogProductCount.textContent = String(state.products.length);
  if (dom.adminCatalogVariantCount) {
    dom.adminCatalogVariantCount.textContent = String(state.products.reduce((total, product) => total + product.variants.length, 0));
  }
}

function renderStorageStatus(node, mode, label) {
  if (!node) return;
  const durable = mode === "vercel blob";
  node.dataset.state = durable ? "connected" : "temporary";
  node.textContent = durable
    ? `${label} sync is connected across devices.`
    : `${label} is using temporary storage. Connect a Vercel Blob store for cross-device reliability.`;
}

async function publishAnnouncement() {
  const id = dom.announcementId.value.trim();
  const title = dom.announcementTitle.value.trim();
  const body = dom.announcementBody.value.trim();
  const label = dom.announcementLabel.value.trim() || "Update";
  const date = dom.announcementDate.value || today();
  const audience = dom.announcementAudience.value.trim();
  let image = dom.announcementImage.value.trim();
  const ctaLabel = dom.announcementCtaLabel.value.trim();
  const ctaUrl = dom.announcementCtaUrl.value.trim();
  if (!title || !body) return;

  try {
    image = await uploadOptionalFile(dom.announcementImageFile, "news", image);
  } catch (error) {
    showToast(error?.message || "News image upload failed");
    return;
  }

  const notificationAnnouncementId = id ? "" : `${Date.now()}`;
  const next = id
    ? state.site.announcements.map((item) =>
      item.id === id ? { ...item, label, title, body, image, date, audience, ctaLabel, ctaUrl } : item,
    )
    : [{
      id: notificationAnnouncementId,
      label,
      title,
      body,
      image,
      date,
      audience,
      ctaLabel,
      ctaUrl,
    }, ...state.site.announcements];

  const saved = await commitAnnouncements(next, { notificationAnnouncementId });
  if (!saved) return;
  clearAnnouncementEditor();
  closeNewsEditor();
  showToast(id ? "Update saved" : "Announcement published");
}

async function commitAnnouncements(nextAnnouncements, options = {}) {
  const previousAnnouncements = state.site.announcements;
  state.site = { ...state.site, announcements: nextAnnouncements };
  renderAdminNews();
  renderAdminMetrics();
  const persisted = await persistAdminContent({
    silent: true,
    notificationAnnouncementId: options.notificationAnnouncementId || "",
  });
  if (!persisted) {
    state.site = { ...state.site, announcements: previousAnnouncements };
    renderAdminNews();
    renderAdminMetrics();
    showToast("News was not saved. Check content storage and try again.");
    return false;
  }

  saveJson(SITE_KEY, state.site);
  renderAnnouncements();
  renderNews();
  renderAdminNews();
  renderAdminMetrics();
  return true;
}

function renderAdminNews() {
  if (!state.adminAuthed) return;
  if (!state.site.announcements.length) {
    dom.adminNewsList.innerHTML = `<div class="empty-state">No updates posted yet.</div>`;
    return;
  }
  dom.adminNewsList.innerHTML = state.site.announcements
    .map((item, index) => `
      <article>
        ${announcementImage(item, index) ? `<img src="${escapeHtml(announcementImage(item, index))}" alt="" width="320" height="205" loading="lazy" decoding="async" />` : `<div class="admin-news-placeholder">No image</div>`}
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.label || "Update")} / ${escapeHtml(item.date || "")}${item.audience ? ` / ${escapeHtml(item.audience)}` : ""}</span>
        </div>
        <div class="admin-news-actions">
          <button class="admin-button admin-secondary" type="button" data-move-announcement="${item.id}" data-direction="-1" ${index === 0 ? "disabled" : ""}>Up</button>
          <button class="admin-button admin-secondary" type="button" data-move-announcement="${item.id}" data-direction="1" ${index === state.site.announcements.length - 1 ? "disabled" : ""}>Down</button>
          <button class="admin-button admin-secondary" type="button" data-edit-announcement="${item.id}">Edit</button>
          <button class="admin-button admin-danger" type="button" data-remove-announcement="${item.id}">Remove</button>
        </div>
      </article>
    `)
    .join("");
}

async function moveAnnouncement(id, direction) {
  const from = state.site.announcements.findIndex((item) => item.id === id);
  if (from < 0 || !direction) return;
  const to = Math.max(0, Math.min(state.site.announcements.length - 1, from + direction));
  if (from === to) return;
  const next = [...state.site.announcements];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  if (await commitAnnouncements(next)) showToast("News order updated");
}

function renderAdminNewsPreview() {
  if (!state.adminAuthed || !dom.adminNewsPreview) return;
  const title = dom.announcementTitle.value.trim() || "Your headline will appear here";
  const body = dom.announcementBody.value.trim() || "A concise buyer update will appear here as you type.";
  const label = dom.announcementLabel.value.trim() || "Update";
  const date = dom.announcementDate.value || today();
  const audience = dom.announcementAudience.value.trim();
  const image = dom.announcementImage.value.trim();
  const cta = dom.announcementCtaLabel.value.trim();
  dom.adminNewsPreview.innerHTML = `
    <article>
      ${image ? `<img src="${escapeHtml(image)}" alt="" />` : `<div class="admin-preview-placeholder">Photo preview</div>`}
      <div>
        <span>${escapeHtml(label)} / ${escapeHtml(date)}${audience ? ` / ${escapeHtml(audience)}` : ""}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
        ${cta ? `<b>${escapeHtml(cta)}</b>` : ""}
      </div>
    </article>
  `;
}

function renderAdminOrders() {
  if (!state.adminAuthed || !dom.adminOrdersList) return;
  if (!state.orders.length) {
    dom.adminOrdersList.innerHTML = `
      <div class="admin-order-toolbar">
        <span>No server orders yet</span>
        <button class="admin-button admin-secondary" type="button" data-refresh-orders>Refresh Inbox</button>
      </div>
      <div class="empty-state">No orders submitted yet.</div>
    `;
    return;
  }
  dom.adminOrdersList.innerHTML = `
    <div class="admin-order-toolbar">
      <span>${state.orders.length} order${state.orders.length === 1 ? "" : "s"}</span>
      <button class="admin-button admin-secondary" type="button" data-refresh-orders>Refresh Inbox</button>
      <button class="admin-button admin-danger" type="button" data-clear-orders>Clear Inbox</button>
    </div>
    ${state.orders.map(renderAdminOrder).join("")}
  `;
}

function renderAdminOrder(order) {
  const date = new Date(order.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const store = order.store || {};
  const totals = order.totals || {};
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const address = formatAddress(store);
  const units = totals.units || lines.reduce((total, line) => total + Number(line.qty || 0), 0);
  const delivery = order.delivery?.email ? `Email ${order.delivery.email}` : "Inbox saved";
  return `
    <article class="admin-order">
      <div class="admin-order-head">
        <div>
          <strong>${escapeHtml(store.storeName || "Unnamed Store")}</strong>
          <span>${escapeHtml(date)} / ${units} item${units === 1 ? "" : "s"} / ${escapeHtml(delivery)}</span>
        </div>
        <div class="admin-order-actions">
          <b>${money(totals.wholesale)}</b>
          <button class="admin-button admin-secondary" type="button" data-copy-email="${escapeHtml(order.id)}">Copy Email</button>
          <button class="admin-button admin-secondary" type="button" data-copy-summary="${escapeHtml(order.id)}">Copy Summary</button>
          <button class="admin-button admin-secondary" type="button" data-copy-draft="${escapeHtml(order.id)}">Copy Email Draft</button>
          <button class="admin-button admin-primary" type="button" data-download-order="${escapeHtml(order.id)}">Download PDF</button>
          <button class="admin-button admin-danger" type="button" data-delete-order="${escapeHtml(order.id)}">Delete</button>
        </div>
      </div>
      <div class="admin-order-id">Order ID: ${escapeHtml(order.id || "")}</div>
      <div class="admin-order-contact">
        ${renderAdminOrderField("Salesperson", String(order.salesperson || store.salesperson || "Parker").replace(/^./, (letter) => letter.toUpperCase()))}
        ${renderAdminOrderField("Contact", store.contactName)}
        ${renderAdminOrderField("Phone", store.phone)}
        ${renderAdminOrderField("Email", store.email)}
        ${address ? renderAdminOrderField("Address", address) : ""}
        ${renderAdminOrderField("MAP Value", money(totals.map))}
      </div>
      ${store.notes ? `<p class="admin-order-notes">${escapeHtml(store.notes)}</p>` : ""}
      <div class="admin-order-lines">
        ${lines.map((line) => `
          <div>
            <span>${escapeHtml(String(line.qty))}x</span>
            <strong>${escapeHtml(line.product)} ${escapeHtml(line.flavor)}</strong>
            <em>#${escapeHtml(line.item)}${line.upc ? ` / UPC ${escapeHtml(line.upc)}` : ""} / ${escapeHtml(line.wholesale)} / line ${money(line.lineWholesale)}</em>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function formatAddress(store = {}) {
  const cityLine = [store.city, store.state, store.zip].filter(Boolean).join(" ");
  return [store.street, cityLine].filter(Boolean).join(", ");
}

function renderAdminOrderField(label, value) {
  if (!value) return "";
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

async function addCustomProduct() {
  const mode = state.adminProductMode;
  const parent = mode === "flavor" ? state.products.find((product) => product.id === dom.customProductParent.value) : null;
  const title = parent?.title || dom.customProductTitle.value.trim();
  const section = parent ? adminSectionForProduct(parent) : dom.customProductSection.value;
  const flavor = dom.customProductFlavor.value.trim();
  const status = normalizeVariantStatus(dom.customProductStatus.value);
  const limitedEdition = dom.customProductLimited.checked;
  const itemNumber = dom.customProductItem.value.trim();
  const upc = dom.customProductUpc.value.trim();
  const casePack = dom.customProductCasePack.value.trim();
  let bottle = dom.customProductBottle.value.trim();
  let panel = dom.customProductPanel.value.trim();
  const wholesaleValue = parseMoney(dom.customProductWholesale.value);
  const mapValue = parseMoney(dom.customProductMap.value) || 0;
  const description = dom.customProductDescription.value.trim() || parent?.description || "";
  const existingImages = splitImageList(dom.customProductImages.value);
  let uploadedGallery = [];

  try {
    bottle = await uploadOptionalFile(dom.customProductBottleFile, "products", bottle);
    panel = await uploadOptionalFile(dom.customProductPanelFile, "products", panel);
    uploadedGallery = await uploadOptionalFiles(dom.customProductGalleryFiles, "products");
  } catch (error) {
    showToast(error?.message || "Product image upload failed");
    return;
  }

  if ((mode === "flavor" && !parent) || !title || !section || !flavor || !itemNumber || !bottle || !panel || !description || wholesaleValue <= 0 || mapValue <= 0) {
    showToast("Complete required product fields before adding");
    return;
  }

  const productId = `${parent ? "extension" : "custom"}-${slugify(title)}-${slugify(flavor)}-${Date.now()}`;
  const variantId = `${productId}-${slugify(flavor)}`;
  const sectionMeta = SECTION_META.find((entry) => entry.slug === section) || SECTION_META[0];
  const extraImages = unique([...existingImages, ...uploadedGallery]);
  const highlights = splitImageList(dom.customProductHighlights.value);
  const adminNotes = dom.customProductNotes.value.trim();
  const product = {
    id: productId,
    custom: true,
    extendsProductId: parent?.id || "",
    title,
    category: parent?.category || sectionMeta.label,
    categorySlug: parent?.categorySlug || section,
    description,
    highlights,
    casePack,
    adminNotes,
    status,
    bottle,
    panel,
    siteImages: unique([bottle, panel, ...extraImages]),
    variants: [
      {
        id: variantId,
        item: itemNumber,
        upc,
        flavor,
        description,
        wholesale: money(wholesaleValue),
        wholesaleValue,
        map: money(mapValue),
        mapValue,
        bottle,
        panel,
        casePack,
        status,
        limitedEdition,
        available: status === "available",
      },
    ],
  };

  state.customProducts.unshift(product);
  state.site.variantOverrides = cleanVariantOverrides({
    ...variantOverrides(),
    [variantId]: { status, limitedEdition },
  });
  saveJson(SITE_KEY, state.site);
  saveJson(CUSTOM_PRODUCTS_KEY, state.customProducts);
  await persistAdminContent({ silent: true });
  const selectedParent = parent?.id || "";
  dom.customProductForm.reset();
  rebuildProductState();
  setProductEditorMode(mode);
  if (selectedParent) {
    dom.customProductParent.value = selectedParent;
    syncProductEditorFromParent();
  }
  renderAdminMetrics();
  closeProductEditor();
  showToast(parent ? `${flavor} added to ${parent.title}` : `${title} added to the catalog`);
}

async function removeCustomProduct(id) {
  const customProduct = state.customProducts.find((product) => product.id === id);
  const label = customProduct?.variants?.[0]?.flavor || customProduct?.title || "this custom item";
  if (!window.confirm(`Remove ${label} from the portal?`)) return;
  const removedVariantIds = new Set((customProduct?.variants || []).map((variant) => variant.id));
  state.customProducts = state.customProducts.filter((product) => product.id !== id);
  state.site.hiddenVariants = hiddenVariantIds().filter((entry) => !removedVariantIds.has(entry));
  saveJson(CUSTOM_PRODUCTS_KEY, state.customProducts);
  saveJson(SITE_KEY, state.site);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  showToast("Product removed");
}

async function hideCatalogVariant(id) {
  const item = findCatalogVariant(id);
  const label = item ? `${item.product.title} ${item.variant.flavor}` : "this SKU";
  if (!window.confirm(`Delete ${label} from the live catalog? You can restore it later from admin.`)) return;
  state.site.hiddenVariants = unique([...hiddenVariantIds(), id]);
  saveJson(SITE_KEY, state.site);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  showToast("SKU deleted from live catalog");
}

async function restoreCatalogVariant(id) {
  state.site.hiddenVariants = hiddenVariantIds().filter((entry) => entry !== id);
  saveJson(SITE_KEY, state.site);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  showToast("SKU restored to live catalog");
}

async function hideCatalogProduct(id) {
  const product = state.products.find((entry) => entry.id === id);
  if (!product) return;
  if (!window.confirm(`Delete ${product.title} from the live catalog? You can restore it later from admin.`)) return;
  const variantIds = product.variants.map((variant) => variant.id);
  state.site.hiddenVariants = unique([...hiddenVariantIds(), ...variantIds]);
  saveJson(SITE_KEY, state.site);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  showToast("Product deleted from live catalog");
}

async function restoreCatalogProduct(id) {
  const product = state.products.find((entry) => entry.id === id);
  if (!product) return;
  const variantIds = new Set(product.variants.map((variant) => variant.id));
  state.site.hiddenVariants = hiddenVariantIds().filter((entry) => !variantIds.has(entry));
  saveJson(SITE_KEY, state.site);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  showToast("Product restored to live catalog");
}

async function updateVariantOverride(id, patch) {
  const found = findCatalogVariant(id);
  if (!found) return;
  const overrides = variantOverrides();
  overrides[id] = {
    ...(overrides[id] || {}),
    ...patch,
  };
  overrides[id] = cleanVariantOverrides({ [id]: overrides[id] })[id] || {};
  if (!Object.keys(overrides[id]).length) delete overrides[id];
  state.site.variantOverrides = overrides;
  saveJson(SITE_KEY, state.site);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  if (patch.status === "coming-soon") showToast("SKU marked coming soon");
  else if (patch.status === "available") showToast("SKU available for ordering");
  else if (patch.status === "inactive") showToast("SKU set inactive");
  else showToast("SKU updated");
}

async function updateVariantImageOverride(input) {
  const id = input.dataset.variantId;
  const action = input.dataset.variantImageAction;
  const role = input.dataset.variantImageRole;
  const index = Number(input.dataset.imageIndex || -1);
  if (!id || !["add", "replace"].includes(action)) return;
  try {
    const url = await uploadOptionalFile(input, "products", "");
    if (!url) return;
    const images = currentVariantImageUrls(id);
    const patch = {};
    if (action === "replace" && index >= 0 && index < images.length) {
      images[index] = url;
      if (role === "bottle") patch.bottle = url;
      if (role === "panel") patch.panel = url;
    } else {
      images.push(url);
    }
    patch.images = unique(images);
    await updateVariantOverride(id, patch);
  } catch (error) {
    showToast(error?.message || "Product image upload failed");
  } finally {
    input.value = "";
  }
}

async function removeVariantGalleryImage(id, index) {
  const images = currentVariantImageUrls(id);
  if (!id || index < 0 || index >= images.length) return;
  if (images.length <= 1) {
    showToast("At least one product photo is required");
    return;
  }
  images.splice(index, 1);
  await updateVariantOverride(id, { images: unique(images) });
}

async function resetVariantImages(id) {
  if (!id) return;
  await updateVariantOverride(id, { bottle: "", panel: "", images: [] });
}

function currentVariantImageUrls(id) {
  const found = findCatalogVariant(id);
  if (!found) return [];
  return adminGalleryForVariant(found.variant, found.product).map((image) => image.src);
}

function adminGalleryForVariant(variant, product) {
  const item = {
    ...variant,
    productId: product.id,
    productTitle: product.title,
    flavor: variant.flavor || "Product",
    bottle: variant.bottle || product.bottle,
    panel: variant.panel || product.panel,
  };
  return imageGalleryForItem(item, product);
}

function galleryRoleForVariantImage(image, variant, product) {
  const bottle = variant.bottle || product.bottle;
  const panel = variant.panel || product.panel;
  if (image.src === bottle) return "bottle";
  if (image.src === panel) return "panel";
  return "gallery";
}

function findCatalogVariant(id) {
  for (const product of state.products) {
    const variant = product.variants.find((entry) => entry.id === id);
    if (variant) return { product, variant };
  }
  return null;
}

function renderAdminProducts() {
  if (!state.adminAuthed || !dom.adminProductsList) return;
  renderProductParentOptions();
  const products = state.products.filter((product) => {
    const section = adminSectionForProduct(product);
    const queryText = [
      product.title,
      product.category,
      ...product.variants.flatMap((variant) => [variant.flavor, variant.item, variant.upc]),
    ].join(" ").toLowerCase();
    return (state.adminProductCategory === "all" || section === state.adminProductCategory) &&
      (!state.adminProductQuery || queryText.includes(state.adminProductQuery));
  });

  if (dom.adminProductLibraryCount) {
    dom.adminProductLibraryCount.textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
  }
  if (!products.length) {
    dom.adminProductsList.innerHTML = `<div class="empty-state">No catalog products match these filters.</div>`;
    return;
  }

  dom.adminProductsList.innerHTML = products
    .map((product) => {
      const hiddenCount = product.variants.filter((variant) => isVariantHidden(variant.id)).length;
      const availableCount = product.variants.filter((variant) => !isVariantHidden(variant.id) && normalizeVariantStatus(variant.status) === "available").length;
      const comingSoonCount = product.variants.filter((variant) => !isVariantHidden(variant.id) && normalizeVariantStatus(variant.status) === "coming-soon").length;
      return `
      <details class="admin-catalog-product">
        <summary>
          <img src="${escapeHtml(product.variants[0]?.bottle || product.bottle || "")}" alt="" width="160" height="160" loading="lazy" decoding="async" />
          <div class="admin-catalog-title">
            <strong>${escapeHtml(product.title)}</strong>
            <span>${escapeHtml(SECTION_META.find((entry) => entry.slug === adminSectionForProduct(product))?.label || product.category || "Catalog")}</span>
          </div>
          <b>${availableCount} available${comingSoonCount ? ` / ${comingSoonCount} soon` : ""}${hiddenCount ? ` / ${hiddenCount} deleted` : ""}</b>
        </summary>
        <div class="admin-variant-list">
          ${product.variants.map((variant) => {
            const hidden = isVariantHidden(variant.id);
            const status = normalizeVariantStatus(variant.status);
            const override = variantOverrides()[variant.id] || {};
            const galleryImages = adminGalleryForVariant(variant, product);
            const hasImageOverride = Boolean(override.bottle || override.panel || override.images?.length);
            return `
            <div class="${hidden ? "is-hidden" : ""} ${status === "coming-soon" ? "is-coming-soon" : ""}">
              <img src="${escapeHtml(variant.bottle || product.bottle || "")}" alt="" width="120" height="120" loading="lazy" decoding="async" />
              <span>
                <strong>${escapeHtml(variant.flavor || "Unflavored")}</strong>
                <small>#${escapeHtml(variant.item || "TBD")} / ${escapeHtml(variant.wholesale || "")} / MAP ${escapeHtml(variant.map || "")}</small>
              </span>
              <div class="admin-variant-actions">
                <i>${hidden ? "Deleted" : variantStatusLabel(status)}</i>
                <select class="admin-variant-status" data-variant-status="${escapeHtml(variant.id)}" aria-label="Set ${escapeHtml(variant.flavor || "SKU")} status">
                  <option value="available" ${status === "available" ? "selected" : ""}>Available</option>
                  <option value="coming-soon" ${status === "coming-soon" ? "selected" : ""}>Coming Soon</option>
                  <option value="inactive" ${status === "inactive" ? "selected" : ""}>Inactive</option>
                </select>
                <label class="admin-mini-check">
                  <input type="checkbox" data-variant-limited="${escapeHtml(variant.id)}" ${variant.limitedEdition ? "checked" : ""} />
                  <span>Limited</span>
                </label>
                <label class="admin-mini-check">
                  <input type="checkbox" data-variant-running-low="${escapeHtml(variant.id)}" ${variant.runningLow ? "checked" : ""} />
                  <span>Running Low</span>
                </label>
                ${hidden
                  ? `<button class="admin-button admin-secondary admin-icon-action" type="button" data-restore-variant="${escapeHtml(variant.id)}">Restore</button>`
                  : variant.customSourceId ? "" : `<button class="admin-button admin-danger admin-icon-action" type="button" data-hide-variant="${escapeHtml(variant.id)}">Delete</button>`}
                ${variant.customSourceId ? `<button class="admin-button admin-danger admin-icon-action" type="button" data-remove-product="${escapeHtml(variant.customSourceId)}">Delete</button>` : ""}
              </div>
              <div class="admin-photo-manager">
                <div class="admin-photo-heading">
                  <strong>Photos</strong>
                  <span>${galleryImages.length} image${galleryImages.length === 1 ? "" : "s"}</span>
                </div>
                <div class="admin-photo-grid">
                  ${galleryImages.map((image, index) => {
                    const role = galleryRoleForVariantImage(image, variant, product);
                    const roleLabel = role === "panel" ? "Facts" : role === "bottle" ? "Front" : "Gallery";
                    return `
                    <div class="admin-photo-item">
                      <img src="${escapeHtml(image.src)}" alt="" width="96" height="96" loading="lazy" decoding="async" />
                      <span>
                        <strong>${escapeHtml(image.label)}</strong>
                        <small>${escapeHtml(roleLabel)}</small>
                      </span>
                      <div>
                        <label class="admin-file-action">
                          <input type="file" accept="image/*" data-variant-id="${escapeHtml(variant.id)}" data-variant-image-action="replace" data-variant-image-role="${escapeHtml(role)}" data-image-index="${index}" />
                          <span>Replace</span>
                        </label>
                        <button class="admin-button admin-secondary admin-icon-action" type="button" data-remove-variant-image="${escapeHtml(variant.id)}" data-image-index="${index}">Delete</button>
                      </div>
                    </div>
                  `}).join("")}
                  <label class="admin-photo-add">
                    <input type="file" accept="image/*" data-variant-id="${escapeHtml(variant.id)}" data-variant-image-action="add" />
                    <span>+ Add Photo</span>
                  </label>
                </div>
                ${hasImageOverride ? `<button class="admin-button admin-secondary admin-icon-action" type="button" data-reset-variant-images="${escapeHtml(variant.id)}">Restore Default Photos</button>` : ""}
              </div>
            </div>
          `}).join("")}
        </div>
        <footer>
          <button class="admin-button admin-secondary" type="button" data-select-product="${escapeHtml(product.id)}">Add Flavor</button>
          ${hiddenCount
            ? `<button class="admin-button admin-secondary" type="button" data-restore-product="${escapeHtml(product.id)}">Restore All</button>`
            : ""}
          ${product.customSourceId
            ? `<button class="admin-button admin-danger" type="button" data-remove-product="${escapeHtml(product.customSourceId)}">Delete Product</button>`
            : `<button class="admin-button admin-danger" type="button" data-hide-product="${escapeHtml(product.id)}">Delete Product</button>`}
        </footer>
      </details>
    `})
    .join("");
}

function setProductEditorMode(mode) {
  state.adminProductMode = mode === "product" ? "product" : "flavor";
  renderProductEditor();
  if (state.adminProductMode === "flavor") syncProductEditorFromParent();
}

function renderProductEditor() {
  if (!state.adminAuthed) return;
  const isFlavor = state.adminProductMode === "flavor";
  dom.customProductModeButtons.forEach((button) => {
    const active = button.dataset.productMode === state.adminProductMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  dom.customProductPanels.forEach((panel) => {
    panel.hidden = panel.dataset.productPanel !== state.adminProductMode;
  });
  dom.customProductParent.required = isFlavor;
  dom.customProductTitle.required = !isFlavor;
  dom.customProductSection.required = !isFlavor;
  dom.customProductEditorTitle.textContent = isFlavor ? "Add Flavor" : "Create Product";
  dom.customProductSubmit.textContent = isFlavor ? "Add Flavor" : "Create Product";
  renderProductParentOptions();
  if (isFlavor && !dom.adminSelectedProduct.innerHTML) syncProductEditorFromParent();
}

function renderProductParentOptions() {
  if (!dom.customProductParent || !state.products.length) return;
  const previous = dom.customProductParent.value;
  const products = [...state.products].sort((a, b) => a.title.localeCompare(b.title));
  dom.customProductParent.innerHTML = products
    .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.title)} (${product.variants.length} flavors)</option>`)
    .join("");
  const preferred = products.some((product) => product.id === previous)
    ? previous
    : products.some((product) => product.id === "defy-hyper-stimulant")
      ? "defy-hyper-stimulant"
      : products[0]?.id;
  if (preferred) dom.customProductParent.value = preferred;
}

function syncProductEditorFromParent() {
  if (state.adminProductMode !== "flavor") return;
  const product = state.products.find((entry) => entry.id === dom.customProductParent.value);
  if (!product) return;
  const reference = product.variants[0] || {};
  dom.customProductTitle.value = product.title;
  dom.customProductSection.value = adminSectionForProduct(product);
  dom.customProductWholesale.value = reference.wholesale || "";
  dom.customProductMap.value = reference.map || "";
  dom.customProductDescription.value = product.description || "";
  dom.customProductBottle.value = "";
  dom.customProductPanel.value = "";
  dom.customProductImages.value = "";
  dom.adminSelectedProduct.innerHTML = `
    <img src="${escapeHtml(reference.bottle || product.bottle || "")}" alt="" />
    <div>
      <strong>${escapeHtml(product.title)}</strong>
      <span>${product.variants.length} existing flavor${product.variants.length === 1 ? "" : "s"}</span>
      <small>Pricing and product copy are prefilled. Add the new flavor's item data and media.</small>
    </div>
  `;
}

function adminSectionForProduct(product) {
  const slug = product.categorySlug;
  if (slug === "thermogenic") return "thermogenics";
  if (["thermogenics", "focus", "pump", "strength", "raws"].includes(slug)) return slug;
  const variant = product.variants?.[0] || {};
  return displaySection({ ...variant, productTitle: product.title, categorySlug: slug });
}

function exportAdminContentBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    announcements: state.site.announcements,
    hiddenVariants: hiddenVariantIds(),
    variantOverrides: variantOverrides(),
    customProducts: state.customProducts,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blackmarket-portal-backup-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Content backup downloaded");
}

function announcementImage(item, index = 0) {
  return item.image || defaultSite.announcements[index % defaultSite.announcements.length]?.image || "";
}

function editAnnouncement(id) {
  const item = state.site.announcements.find((entry) => entry.id === id);
  if (!item) return;
  dom.announcementId.value = item.id;
  if (item.label && ![...dom.announcementLabel.options].some((option) => option.value === item.label)) {
    dom.announcementLabel.add(new Option(item.label, item.label));
  }
  dom.announcementLabel.value = item.label || "";
  dom.announcementDate.value = item.date || today();
  dom.announcementAudience.value = item.audience || "";
  dom.announcementTitle.value = item.title || "";
  dom.announcementBody.value = item.body || "";
  dom.announcementImage.value = item.image || "";
  dom.announcementCtaLabel.value = item.ctaLabel || "";
  dom.announcementCtaUrl.value = item.ctaUrl || "";
  dom.announcementSubmit.textContent = "Save Update";
  dom.announcementCancel.hidden = false;
  renderAdminNewsPreview();
  openNewsEditor();
  dom.announcementTitle.focus();
}

function clearAnnouncementEditor() {
  dom.announcementForm.reset();
  dom.announcementId.value = "";
  dom.announcementDate.value = today();
  dom.announcementSubmit.textContent = "Publish Update";
  dom.announcementCancel.hidden = true;
  renderAdminNewsPreview();
}

async function uploadOptionalFile(input, scope, fallback = "") {
  const file = input?.files?.[0];
  if (!file) return fallback;
  showToast("Preparing image...");
  const form = new FormData();
  form.append("file", file);
  form.append("scope", scope);
  try {
    const response = await fetch(ASSET_UPLOAD_URL, {
      method: "POST",
      headers: adminHeaders(),
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.ok) return body.url;
    if (response.status === 401 || response.status === 403) {
      throw new Error(body.message || "Image upload is not authorized");
    }
  } catch (error) {
    if (/not authorized|unauthorized/i.test(String(error?.message || ""))) throw error;
  }

  const dataUrl = await optimizeImageForPortal(file, scope);
  showToast("Cloud media is offline; image saved with portal content");
  return dataUrl;
}

async function uploadOptionalFiles(input, scope) {
  const files = Array.from(input?.files || []);
  const urls = [];
  for (const file of files) {
    const holder = { files: [file] };
    urls.push(await uploadOptionalFile(holder, scope, ""));
  }
  return urls;
}

async function optimizeImageForPortal(file, scope) {
  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const maxDimension = scope === "news" ? 1600 : 1200;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, "image/webp", 0.84);
    return blobToDataUrl(blob || file);
  } finally {
    URL.revokeObjectURL(source);
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be read"));
    image.src = source;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Image could not be prepared"));
    reader.readAsDataURL(blob);
  });
}

async function saveSite(options = {}) {
  saveJson(SITE_KEY, state.site);
  renderAnnouncements();
  renderNews();
  renderAdminNews();
  return persistAdminContent(options);
}

function setView(view, options = {}) {
  if (view === "cart") {
    openCartDrawer(document.activeElement, options);
    return;
  }
  closeCartDrawer({ history: false });
  closeProductModal({ history: false });
  closeNewsModal();
  state.activeView = view;
  dom.views.forEach((section) => section.classList.toggle("active", section.id === `${view}View`));
  dom.navButtons.forEach((button) => {
    const active = button.dataset.view === view || (button.dataset.view === "landing" && view === "products");
    button.classList.toggle("active", active);
  });
  document.body.classList.remove("nav-open");
  if (view !== "admin") closeAdminEditors();
  document.body.dataset.view = view;
  if (view === "admin" && state.adminAuthed) {
    Promise.all([
      loadServerOrders({ silent: true }),
      loadServerContent({ silent: true }),
    ]);
  }
  if (options.history !== false) pushPortalRoute(options.path || pathForView(view), { view });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pathForView(view) {
  return {
    landing: "/",
    products: "/products",
    news: "/news",
    catalog: "/catalog",
    cart: "/cart",
    admin: "/admin",
  }[view] || "/products";
}

function syncAccountDestinations() {
  const destination = accountDestination(state.accountAuthenticated);
  document.querySelectorAll("[data-account-route]").forEach((link) => link.setAttribute("href", destination));
  let preload = document.querySelector("link[data-account-prefetch]");
  if (!preload) {
    preload = document.createElement("link");
    preload.rel = "prefetch";
    preload.dataset.accountPrefetch = "true";
    document.head.append(preload);
  }
  preload.href = destination;
  syncCheckoutSalesperson();
}

function syncCheckoutSalesperson() {
  if (!dom.checkoutSalespersonField || !dom.checkoutSalesperson) return;
  const guestSelectionRequired = state.accountResolved && !state.accountAuthenticated;
  dom.checkoutSalespersonField.hidden = !guestSelectionRequired;
  dom.checkoutSalesperson.disabled = !guestSelectionRequired;
  dom.checkoutSalesperson.required = guestSelectionRequired;
  updateOrderState();
}

function goHome(options = {}) {
  goPortalHome({
    replace: Boolean(options.replace),
    onBeforeNavigate: () => {
      closeCartDrawer({ history: false });
      closeProductModal({ history: false });
      closeNewsModal();
      state.query = "";
      state.activeFilter = PORTAL_HOME_CATEGORY;
      if (dom.search) dom.search.value = "";
      renderCategoryNav();
      renderCatalog();
      setView("landing", { history: false });
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    onNavigate: ({ path }) => {
      const current = `${window.location.pathname}${window.location.search}`;
      const method = options.replace || current === path ? "replaceState" : "pushState";
      window.history[method]({
        ...window.history.state,
        blackmarketPortal: { view: "landing", depth: options.replace ? 0 : Number(window.history.state?.blackmarketPortal?.depth || 0) + 1 },
      }, "", path);
      initializePortalHistory(path);
      return true;
    },
  });
}

function prepareRouteState() {
  const route = routeFromLocation();
  state.activeView = route.view;
  state.pendingRoute = route;
  if (route.filter) state.activeFilter = route.filter;
  window.history.replaceState(
    { ...window.history.state, blackmarketPortal: { ...(window.history.state?.blackmarketPortal || {}), view: route.view, depth: Number(window.history.state?.blackmarketPortal?.depth || 0) } },
    "",
    `${window.location.pathname}${window.location.search}`,
  );
  initializePortalHistory();
}

function applyPendingRoute() {
  const route = state.pendingRoute;
  state.pendingRoute = null;
  if (!route) return;
  if (route.itemId) openProductModal(route.itemId, document.activeElement, { history: false });
  if (route.cart) openCartDrawer(document.activeElement, { history: false });
}

function applyLocationRoute() {
  const route = routeFromLocation();
  if (route.filter) state.activeFilter = route.filter;
  setView(route.view, { history: false });
  renderCategoryNav();
  renderCatalog();
  if (route.itemId) openProductModal(route.itemId, document.activeElement, { history: false });
  if (route.cart) openCartDrawer(document.activeElement, { history: false });
}

function routeFromLocation() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const filter = new URLSearchParams(window.location.search).get("category");
  const validFilter = LANDING_OPTIONS.some((entry) => entry.slug === filter) ? filter : "";
  if (path.startsWith("/products/")) {
    const itemId = decodeURIComponent(path.slice("/products/".length));
    const item = state.items.find((entry) => entry.id === itemId || entry.productId === itemId);
    return { view: "products", itemId: item?.id || "", filter: item?.section || validFilter };
  }
  if (path === "/products") return { view: "products", filter: validFilter };
  if (path === "/news") return { view: "news" };
  if (path === "/catalog") return { view: "catalog" };
  if (path === "/cart") return { view: "products", cart: true };
  if (path === "/admin") return { view: "admin" };
  return { view: "landing" };
}

function pushPortalRoute(path, detail = {}) {
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === path) return;
  const portalHistory = recordPortalNavigation(path);
  const depth = Number(window.history.state?.blackmarketPortal?.depth || 0) + 1;
  window.history.pushState({
    blackmarketPortal: { ...detail, depth },
    blackmarketPortalIndex: portalHistory.index,
  }, "", path);
}

function safePortalBack() {
  if (dom.productModal?.open) {
    closeProductModal();
    return;
  }
  if (dom.cartView?.classList.contains("active")) {
    closeCartDrawer();
    return;
  }
  safePortalHistoryBack(() => goHome({ replace: true }));
}

function installLegacyMobileNavigation() {
  const nav = document.querySelector(".portal-bottom-nav");
  if (!nav) return;
  const overlayClasses = ["cart-open", "modal-open", "nav-open", "admin-news-editing", "admin-product-editing"];

  const syncOverlay = () => {
    const blocked = overlayClasses.some((name) => document.body.classList.contains(name))
      || Boolean(document.querySelector("dialog[open], [aria-modal='true']:not([aria-hidden='true'])"));
    nav.dataset.overlay = blocked ? "true" : "false";
    nav.setAttribute("aria-hidden", blocked ? "true" : "false");
  };

  const observer = new MutationObserver(syncOverlay);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  syncOverlay();
}

function pruneCart() {
  let changed = false;
  Object.keys(state.cart).forEach((id) => {
    const item = state.items.find((entry) => entry.id === id);
    if (!item || !isOrderable(item) || state.cart[id] <= 0) {
      delete state.cart[id];
      changed = true;
    }
  });
  if (changed) saveJson(CART_KEY, state.cart);
}

function pulseCart() {
  dom.headerCartButton.classList.remove("pulse");
  window.requestAnimationFrame(() => dom.headerCartButton.classList.add("pulse"));
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function safeFilePart(value) {
  return slugify(value || "store-order") || "store-order";
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Unable to save ${key}:`, error?.message || error);
    return false;
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function parseMoney(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function splitImageList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shortDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : "Unknown";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("show"), 2200);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then(() => {
      if (state.adminResolved) void syncPushSubscription({ showPrompt: true });
    }).catch((error) => console.warn("Service worker registration failed:", error));
  });
}

const PUSH_CONFIG_URL = "/api/push/config";
const PUSH_SUBSCRIPTION_URL = "/api/push/subscription";

async function enablePushNotifications() {
  if (!isInstalledApp()) {
    showToast("Install BlackMarket first to enable notifications");
    updatePushStatus();
    return false;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    showToast("Notifications are not supported on this device");
    updatePushStatus();
    return false;
  }

  try {
    const permission = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== "granted") {
      hidePushPrompt();
      updatePushStatus();
      showToast(permission === "denied" ? "Notifications are blocked in device settings" : "Notifications were not enabled");
      return false;
    }
    const synced = await syncPushSubscription({ manual: true });
    if (synced) showToast(state.adminAuthed ? "Order notifications enabled" : "News notifications enabled");
    return synced;
  } catch (error) {
    console.error("Notification setup failed:", error);
    showToast(error?.message || "Notifications could not be enabled");
    updatePushStatus("Setup failed. Tap to try again.");
    return false;
  }
}

async function syncPushSubscription(options = {}) {
  if (!state.adminResolved || !isInstalledApp() || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    updatePushStatus();
    return false;
  }

  if (Notification.permission === "default") {
    updatePushStatus();
    if (options.showPrompt && pushPromptCanAppear()) showPushPrompt();
    return false;
  }
  if (Notification.permission !== "granted") {
    hidePushPrompt();
    updatePushStatus();
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const configResponse = await fetch(PUSH_CONFIG_URL, { cache: "no-store" });
    const config = await configResponse.json().catch(() => ({}));
    if (!configResponse.ok || !config.ok || !config.configured || !config.publicKey) {
      throw new Error("Notification delivery is not configured yet.");
    }
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(config.publicKey),
      });
    }
    const audience = options.audience || (state.adminAuthed ? "admin" : "customer");
    const response = await fetch(PUSH_SUBSCRIPTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, subscription: subscription.toJSON() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || "Notification subscription failed.");
    localStorage.setItem("blackmarket-push-audience", audience);
    localStorage.removeItem("blackmarket-push-dismissed");
    hidePushPrompt();
    updatePushStatus();
    return true;
  } catch (error) {
    if (options.manual) throw error;
    console.warn("Notification subscription sync failed:", error);
    updatePushStatus("Not connected. Tap to retry.");
    return false;
  }
}

function showPushPrompt() {
  if (!dom.pushPrompt) return;
  const admin = state.adminAuthed;
  if (dom.pushPromptTitle) dom.pushPromptTitle.textContent = admin ? "Never miss a new order" : "Get BlackMarket news";
  if (dom.pushPromptMessage) {
    dom.pushPromptMessage.textContent = admin
      ? "Turn on alerts for new orders assigned to your admin account."
      : "Turn on alerts when BlackMarket publishes a news update.";
  }
  dom.pushPrompt.classList.remove("hidden");
}

function hidePushPrompt() {
  dom.pushPrompt?.classList.add("hidden");
}

function pushPromptCanAppear() {
  const dismissedAt = Number(localStorage.getItem("blackmarket-push-dismissed") || 0);
  return !dismissedAt || Date.now() - dismissedAt > 7 * 24 * 60 * 60_000;
}

function updatePushStatus(message = "") {
  if (!dom.adminPushStatus || !dom.adminPushNotifications) return;
  let status = message;
  let button = "Enable Alerts";
  if (!status && !isInstalledApp()) status = "Install the app to receive order alerts.";
  else if (!status && (!("Notification" in window) || !("PushManager" in window))) status = "Notifications are not supported on this device.";
  else if (!status && Notification.permission === "granted") {
    status = "Order alerts are enabled on this device.";
    button = "Reconnect";
  } else if (!status && Notification.permission === "denied") status = "Blocked in this device's notification settings.";
  else if (!status) status = "Receive order alerts while the app is closed.";
  dom.adminPushStatus.textContent = status;
  dom.adminPushNotifications.textContent = button;
  dom.adminPushNotifications.disabled = !isInstalledApp() || !("Notification" in window) || Notification.permission === "denied";
}

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

/* PWA install prompt */

let deferredInstallPrompt = null;

const installPrompt = document.querySelector("#installPrompt");
const installButton = document.querySelector("#installButton");
const dismissInstall = document.querySelector("#dismissInstall");
const installMessage = document.querySelector("#installMessage");
const installBackButton = document.querySelector("#installBackButton");

const installTutorial = document.querySelector("#installTutorial");
const installStepImage = document.querySelector("#installStepImage");
const installStepText = document.querySelector("#installStepText");
const installStepNumber = document.querySelector("#installStepNumber");

const installSteps = [
  {
    image: "/assets/install-step1.png",
    text: "Tap the three dots in the bottom right corner."
  },
  {
    image: "/assets/install-step2.png",
    text: "Tap the Share button."
  },
  {
    image: "/assets/install-step3.png",
    text: "Tap View More."
  },
  {
    image: "/assets/install-step4.png",
    text: "Tap Add to Home Screen."
  },
  {
    image: "/assets/install-step5.png",
    text: "Tap Add to install BlackMarket."
  }
];

let currentInstallStep = 0;

function isIosDevice() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function showInstallStep(index) {
  const step = installSteps[index];
  if (!step) return;

  currentInstallStep = index;

  installTutorial?.classList.remove("hidden");

  if (installStepImage) {
    installStepImage.src = step.image;
  }

  const nextStep = installSteps[index + 1];
  if (nextStep) {
    const preload = new Image();
    preload.decoding = "async";
    preload.src = nextStep.image;
  }

  if (installStepText) {
    installStepText.textContent = step.text;
  }

  if (installStepNumber) {
    installStepNumber.textContent = String(index + 1);
  }

    installButton.textContent =
    index === installSteps.length - 1 ? "Done" : "Next";
  if (installButton) {
    installButton.textContent =
      index === installSteps.length - 1 ? "Done" : "Next";
  }

  if (installBackButton) {
    installBackButton.classList.toggle("hidden", index === 0);
  }

  if (dismissInstall) {
    dismissInstall.classList.add("hidden");
  }
}

function showInstallPrompt() {
  if (!installPrompt || isStandaloneMode()) return;

const dismissed = localStorage.getItem("blackmarket-install-dismissed");

if (dismissed) {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (Date.now() - Number(dismissed) < sevenDays) {
    return;
  }
}

  installPrompt.classList.remove("hidden");
dismissInstall?.classList.remove("hidden");

  if (isIosDevice()) {
    installMessage.textContent =
      "Follow these quick steps to add BlackMarket to your Home Screen.";
    installButton.textContent = "Installation Guide";
  } else {
    installMessage.textContent =
      "Install BlackMarket for faster access from your Home Screen.";
  }
}

window.addEventListener("load", () => {
  if (isIosDevice()) {
    setTimeout(showInstallPrompt, 8000);
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  setTimeout(showInstallPrompt, 8000);
});

installButton?.addEventListener("click", async () => {
  if (isIosDevice()) {
    if (!installTutorial || installTutorial.classList.contains("hidden")) {
      showInstallStep(0);
      installButton.textContent = "Next";
      return;
    }

    if (currentInstallStep < installSteps.length - 1) {
      showInstallStep(currentInstallStep + 1);
      return;
    }

    localStorage.setItem("blackmarket-install-dismissed", "true");
    installPrompt.classList.add("hidden");
    return;
  }

  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();

  await deferredInstallPrompt.userChoice;

  deferredInstallPrompt = null;
  installPrompt.classList.add("hidden");
});

installBackButton?.addEventListener("click", () => {
  if (currentInstallStep > 0) {
    showInstallStep(currentInstallStep - 1);
  }
});

dismissInstall?.addEventListener("click", () => {
  installPrompt.classList.add("hidden");

  localStorage.setItem(
    "blackmarket-install-dismissed",
    Date.now().toString()
  );
});
