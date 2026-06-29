const DATA_URL = "/catalog-data.json?v=20260629-streettarts-admin";
const CATALOG_PAGES_URL = "/catalog-pages.json?v=20260629-streettarts-admin";
const ORDERS_API_URL = "/api/orders";
const CONTENT_API_URL = "/api/content";
const ORDER_SUBMIT_URL = "/api/send-order";
const ASSET_UPLOAD_URL = "/api/upload-asset";
const CART_KEY = "blackmarket-wholesale-cart-v4";
const STORE_KEY = "blackmarket-wholesale-store-v3";
const SITE_KEY = "blackmarket-wholesale-site-v1";
const ADMIN_KEY = "blackmarket-wholesale-admin-v1";
const ORDERS_KEY = "blackmarket-wholesale-orders-v1";
const CUSTOM_PRODUCTS_KEY = "blackmarket-wholesale-custom-products-v1";

const ADMIN_USER = "pmart";
const ADMIN_PASS = "123pmart";
const MEDIA_PRELOAD_CONCURRENCY = 8;
const ADMIN_SECTIONS = new Set(["orders", "news", "products", "settings"]);
const CATALOG_TRANSITION_OUT_MS = 110;
const CATALOG_TRANSITION_IN_MS = 340;
let catalogTransitionToken = 0;
let catalogTransitionTimer = 0;

const SECTION_META = [
  { slug: "thermogenics", label: "Thermogenics" },
  { slug: "focus", label: "High Stim & Nootropics" },
  { slug: "pump", label: "Pump" },
  { slug: "strength", label: "Strength" },
  { slug: "raws", label: "RAWS" },
];

const LANDING_OPTIONS = [
  { slug: "thermogenics", label: "Thermogenics", match: (item) => item.productId === "cuts-thermogenic-pre-workout" },
  { slug: "focus", label: "High Stim & Nootropics", match: (item) => item.productId === "defy-hyper-stimulant" },
  { slug: "pump", label: "Pump", match: (item) => item.productId === "pump-hyper-pump-pre-workout" },
  { slug: "strength", label: "Strength", match: (item) => item.productId === "bulk-apex-strength-pre-workout" },
  { slug: "raws", label: "RAWS", match: (item) => item.productId === "creatine-monohydrate-raw" },
  { slug: "all", label: "All Products", match: (item) => item.productId === "rule-hyper-focus" },
];

const PRODUCT_PANEL_OVERRIDES = {
  "bulk-apex-strength-pre-workout": "/assets/site-images/bulk-apex-strength-pre-workout-5-bulk-apex-sup-facts.jpg",
  "nootropic-high-focus-pre-workout": "/assets/products/nootropic-high-focus-pre-workout-panel.png",
  "scorch-ultra-thermogenic": "/assets/site-images/scorch-ultra-thermogenic-6-scorch-killshot-ingred.jpg",
  "underground-high-stimulant": "/assets/site-images/underground-high-stimulant-6-under-peach-sup-fact.png",
  "tone-weight-loss-pre-workout": "/assets/site-images/tone-weight-loss-pre-workout-panel-tonerl-crop.png",
};

const defaultSite = {
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
  adminAuthed: loadJson(ADMIN_KEY, false),
  activeAdminSection: "orders",
  adminProductMode: "flavor",
  adminProductQuery: "",
  adminProductCategory: "all",
  orderStorageMode: "local fallback",
  contentStorageMode: "local fallback",
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
  cartBackdrop: document.querySelector("#cartBackdrop"),
  cartBadge: document.querySelector("#cartBadge"),
  sideCartCount: document.querySelector("#sideCartCount"),
  catalog: document.querySelector("#catalog"),
  catalogCount: document.querySelector("#catalogCount"),
  search: document.querySelector("#searchInput"),
  categoryNav: document.querySelector("#categoryNav"),
  announcementBand: document.querySelector("#announcementBand"),
  catalogPages: document.querySelector("#catalogPages"),
  cartItems: document.querySelector("#cartItems"),
  cartTitleCount: document.querySelector("#cartTitleCount"),
  continueShopping: document.querySelector("#continueShopping"),
  orderUnits: document.querySelector("#orderUnits"),
  orderTotal: document.querySelector("#orderTotal"),
  orderHint: document.querySelector("#orderHint"),
  sendOrder: document.querySelector("#sendOrder"),
  storeForm: document.querySelector("#storeForm"),
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
  adminNewsPreview: document.querySelector("#adminNewsPreview"),
  adminNewsList: document.querySelector("#adminNewsList"),
  adminOrdersList: document.querySelector("#adminOrdersList"),
  adminOrderCount: document.querySelector("#adminOrderCount"),
  adminOrderRevenue: document.querySelector("#adminOrderRevenue"),
  adminProductCount: document.querySelector("#adminProductCount"),
  adminNewsCount: document.querySelector("#adminNewsCount"),
  adminStorageMode: document.querySelector("#adminStorageMode"),
  adminContentStorageMode: document.querySelector("#adminContentStorageMode"),
  adminLogout: document.querySelector("#adminLogout"),
  customProductForm: document.querySelector("#customProductForm"),
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
  productModal: document.querySelector("#productModal"),
  modalContent: document.querySelector("#modalContent"),
  closeProductModal: document.querySelector("#closeProductModal"),
  newsModal: document.querySelector("#newsModal"),
  newsModalContent: document.querySelector("#newsModalContent"),
  closeNewsModal: document.querySelector("#closeNewsModal"),
  orderDownloadModal: document.querySelector("#orderDownloadModal"),
  orderDownloadSummary: document.querySelector("#orderDownloadSummary"),
  downloadOrderCopy: document.querySelector("#downloadOrderCopy"),
  sendWithoutDownload: document.querySelector("#sendWithoutDownload"),
  cancelOrderSend: document.querySelector("#cancelOrderSend"),
  toast: document.querySelector("#toast"),
};

init();

async function init() {
  const [response, catalogResponse, contentResponse] = await Promise.all([
    fetch(DATA_URL),
    fetch(CATALOG_PAGES_URL).catch(() => null),
    fetch(CONTENT_API_URL, { cache: "no-store" }).catch(() => null),
  ]);
  const data = await response.json();
  const catalogData = catalogResponse?.ok ? await catalogResponse.json() : { pages: [] };
  const contentData = contentResponse?.ok ? await contentResponse.json().catch(() => null) : null;
  if (contentData?.content) applyServerContent(contentData.content);
  if (contentData?.storage) state.contentStorageMode = contentData.storage;
  state.baseProducts = normalizeProducts(data.products);
  state.products = mergeProducts();
  state.items = buildItems(state.products);
  state.catalogPages = catalogData.pages || [];
  preloadProductMedia();
  pruneCart();
  if (state.adminAuthed) await loadServerOrders({ silent: true });
  hydrateStoreForm();
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
  document.body.dataset.view = state.activeView;
}

function bindEvents() {
  dom.mobileNavToggle?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  dom.brandHome.addEventListener("click", () => setView("landing"));
  dom.headerCartButton.addEventListener("click", openCartDrawer);
  dom.cartBackdrop.addEventListener("click", closeCartDrawer);
  dom.continueShopping.addEventListener("click", closeCartDrawer);

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
      setQty(id, getQty(id) + Number(adjust.dataset.adjust));
      if (Number(adjust.dataset.adjust) > 0) pulseCart();
      return;
    }

    const detail = event.target.closest("[data-detail]");
    if (detail) openProductModal(detail.dataset.detail);
  });

  dom.catalog.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button")) return;
    const card = event.target.closest("[data-detail]");
    if (!card) return;
    event.preventDefault();
    openProductModal(card.dataset.detail);
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
    openNewsModal(card.dataset.news);
  });

  dom.newsList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-news]");
    if (!card) return;
    event.preventDefault();
    openNewsModal(card.dataset.news);
  });

  dom.storeForm.addEventListener("input", () => {
    saveStoreForm();
    updateOrderState();
  });

  dom.sendOrder.addEventListener("click", sendOrder);

  dom.adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.querySelector("#adminUsername").value.trim();
    const password = document.querySelector("#adminPassword").value;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      state.adminAuthed = true;
      saveJson(ADMIN_KEY, true);
      renderAdmin();
      Promise.all([
        loadServerOrders({ silent: true }),
        loadServerContent({ silent: true }),
      ]);
      showToast("Admin unlocked");
    } else {
      showToast("Invalid admin login");
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

  dom.announcementCancel.addEventListener("click", clearAnnouncementEditor);
  dom.announcementForm.addEventListener("input", renderAdminNewsPreview);

  dom.adminNewsList.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-announcement]");
    if (remove) {
      state.site.announcements = state.site.announcements.filter((item) => item.id !== remove.dataset.removeAnnouncement);
      if (dom.announcementId.value === remove.dataset.removeAnnouncement) clearAnnouncementEditor();
      saveSite();
      renderAdminMetrics();
      return;
    }

    const edit = event.target.closest("[data-edit-announcement]");
    if (edit) editAnnouncement(edit.dataset.editAnnouncement);
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

    const clear = event.target.closest("[data-clear-orders]");
    if (clear) {
      await clearServerOrders();
    }
  });

  dom.adminLogout.addEventListener("click", () => {
    state.adminAuthed = false;
    saveJson(ADMIN_KEY, false);
    renderAdmin();
  });

  dom.customProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addCustomProduct();
  });

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
      setProductEditorMode("flavor");
      dom.customProductParent.value = select.dataset.selectProduct;
      syncProductEditorFromParent();
      dom.customProductForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const remove = event.target.closest("[data-remove-product]");
    if (!remove) return;
    removeCustomProduct(remove.dataset.removeProduct);
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

  dom.closeNewsModal.addEventListener("click", closeNewsModal);
  dom.newsModal.addEventListener("click", (event) => {
    if (event.target === dom.newsModal) closeNewsModal();
  });

  dom.orderDownloadModal.addEventListener("click", (event) => {
    if (event.target === dom.orderDownloadModal) dom.cancelOrderSend.click();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProductModal();
      closeNewsModal();
      closeOrderDownloadModal();
      closeCartDrawer();
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
    variants: product.variants.map((variant) => ({ ...variant })),
    siteImages: [...(product.siteImages || [])],
  }));

  state.customProducts.forEach((customProduct) => {
    const customVariants = (customProduct.variants || []).map((variant) => ({
      ...variant,
      customSourceId: customProduct.id,
    }));
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
  pruneCart();
  renderProductEntrypoints();
  renderCategoryNav();
  renderCatalog();
  renderCart();
  renderAdminProducts();
}

function buildItems(products) {
  return products.flatMap((product, productIndex) =>
    product.variants.map((variant, variantIndex) => {
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
        panel: variant.panel || product.panel,
        sort: productIndex * 100 + variantIndex,
      };
      item.section = displaySection(item);
      item.fullTitle = `${item.productTitle} ${item.flavor}`.replace(/\s+/g, " ").trim();
      item.searchText = [item.productTitle, item.flavor, item.item, item.upc, item.wholesale, item.map, item.section]
        .join(" ")
        .toLowerCase();
      return item;
    }),
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
  const cards = LANDING_OPTIONS.map((option) => {
    const item = representativeItem(option);
    return `
      <button class="landing-card" type="button" data-filter-jump="${escapeHtml(option.slug)}">
        <span class="landing-card-media">${item ? `<img src="${escapeHtml(item.bottle)}" alt="" loading="lazy" />` : ""}</span>
        <span class="landing-card-label">${escapeHtml(option.label)}</span>
      </button>
    `;
  }).join("");

  dom.landingGrid.innerHTML = cards;
  dom.productsDropdown.innerHTML = LANDING_OPTIONS.map((option) => {
    const item = representativeItem(option);
    return `
      <button type="button" data-filter-jump="${escapeHtml(option.slug)}">
        ${item ? `<img src="${escapeHtml(item.bottle)}" alt="" loading="lazy" />` : ""}
        <span>${escapeHtml(option.label)}</span>
      </button>
    `;
  }).join("");
}

function representativeItem(option) {
  return state.items.find(option.match) || state.items.find((item) => item.section === option.slug) || state.items[0];
}

function renderCategoryNav() {
  dom.categoryNav.innerHTML = LANDING_OPTIONS
    .map((filter) => {
      const item = representativeItem(filter);
      const active = state.activeFilter === filter.slug ? "active" : "";
      return `
        <button class="category-tile ${active}" type="button" data-filter="${escapeHtml(filter.slug)}">
          <span class="category-tile-media">${item ? `<img src="${escapeHtml(item.bottle)}" alt="" loading="lazy" />` : ""}</span>
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
  renderCategoryNav();
  renderCatalog({ animate: options.keepView });
  if (!options.keepView) setView("products");
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
    <article class="news-card" data-news="${escapeHtml(item.id)}" tabindex="0" aria-label="Open ${escapeHtml(item.title)}">
      <div class="news-thumb">
        ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : ""}
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
    .map((page) => `
      <figure class="catalog-page">
        <img src="${escapeHtml(page.src)}" width="${page.width}" height="${page.height}" alt="BLACKMARKET catalog page ${page.page}" loading="lazy" />
      </figure>
    `)
    .join("");
}

function openNewsModal(id) {
  const index = state.site.announcements.findIndex((entry) => entry.id === id);
  const item = state.site.announcements[index];
  if (!item) return;
  const image = announcementImage(item, index);
  dom.newsModalContent.innerHTML = `
    <article class="news-detail">
      ${image ? `<img src="${escapeHtml(image)}" alt="" />` : ""}
      <div>
        <p class="eyebrow">${escapeHtml(item.label || "Update")} / ${escapeHtml(item.date || "")}${item.audience ? ` / ${escapeHtml(item.audience)}` : ""}</p>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.body)}</p>
        ${item.ctaLabel && item.ctaUrl ? `<a class="news-cta" href="${escapeHtml(item.ctaUrl)}">${escapeHtml(item.ctaLabel)}</a>` : ""}
      </div>
    </article>
  `;
  showDialog(dom.newsModal);
}

function closeNewsModal() {
  if (dom.newsModal.open) dom.newsModal.close();
  if (!dom.productModal.open && !dom.orderDownloadModal.open) document.body.classList.remove("modal-open");
}

function closeOrderDownloadModal() {
  if (dom.orderDownloadModal.open) dom.orderDownloadModal.close();
  if (!dom.productModal.open && !dom.newsModal.open) document.body.classList.remove("modal-open");
}

function catalogHtml(items) {
  if (!items.length) return `<div class="empty-state">No products found.</div>`;
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
      ${items.map(renderSkuCard).join("")}
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
            ${productItems.map(renderSkuCard).join("")}
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
  if (state.activeFilter === "all") return "All Products";
  return SECTION_META.find((section) => section.slug === state.activeFilter)?.label || "Products";
}

function renderSkuCard(item) {
  return `
    <article class="sku-card" data-detail="${item.id}" tabindex="0" aria-label="View ${escapeHtml(item.fullTitle)} details">
      <div class="sku-meta">
        <span>#${escapeHtml(item.item)}</span>
        <span class="${item.limitedEdition ? "sku-limited" : ""}">${item.limitedEdition ? "Limited / " : ""}${escapeHtml(item.flavor)}</span>
      </div>
      <div class="bottle-stage">
        <img src="${item.bottle}" alt="${escapeHtml(item.fullTitle)} bottle" loading="lazy" />
      </div>
      <h4>${escapeHtml(item.fullTitle)}</h4>
      <div class="sku-price">
        <strong>${escapeHtml(item.wholesale)}</strong>
        <span>MAP ${escapeHtml(item.map)}</span>
      </div>
      ${renderMiniQty(item.id)}
    </article>
  `;
}

function preloadProductMedia() {
  enqueueMediaPreloads(prioritizedProductMediaUrls());
}

function prioritizedProductMediaUrls() {
  const panelUrls = unique(state.items.map((item) => item.panel));
  const bottleUrls = unique(state.items.map((item) => item.bottle));
  const galleryUrls = unique(state.products.flatMap((product) => [product.panel, product.bottle, ...(product.siteImages || [])]));
  const announcementUrls = unique(state.site.announcements.map((item, index) => announcementImage(item, index)));
  return unique([...panelUrls, ...bottleUrls, ...galleryUrls, ...announcementUrls]);
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
  return state.items
    .filter((item) => state.activeFilter === "all" || item.section === state.activeFilter)
    .filter((item) => !state.query || item.searchText.includes(state.query))
    .sort((a, b) => sectionIndex(a.section) - sectionIndex(b.section) || productRank(a) - productRank(b) || a.sort - b.sort);
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

function openProductModal(itemId) {
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
            <img src="${item.bottle}" alt="${escapeHtml(item.fullTitle)} bottle" />
          </div>
          <div class="detail-copy">
            <p class="eyebrow">#${escapeHtml(item.item)}${item.limitedEdition ? " / Limited Edition" : ""}</p>
            <h2>${escapeHtml(item.fullTitle)}</h2>
            <p>${escapeHtml(item.description || item.productDescription)}</p>
            <div class="detail-price">
              <div><span>Wholesale</span><strong>${escapeHtml(item.wholesale)}</strong></div>
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
          <img id="detailMediaImage" src="${item.panel}" alt="${escapeHtml(item.fullTitle)} nutrition label" />
        </div>
      </div>
      ${gallery.length > 1 ? `
        <div class="detail-gallery" aria-label="Product images">
          ${gallery.map((image, index) => `
            <button class="${index === 0 ? "active" : ""}" type="button" data-gallery-src="${escapeHtml(image.src)}" data-gallery-title="${escapeHtml(image.label)}">
              <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.label)}" />
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
  showDialog(dom.productModal);
}

function showDialog(dialog) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    if (!dialog.open) dialog.showModal();
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(scrollX, scrollY);
    window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
  });
}

function imageGalleryForItem(item, product) {
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
  const galleryButton = event.target.closest("[data-gallery-src]");
  if (galleryButton) {
    event.stopPropagation();
    const image = document.querySelector("#detailMediaImage");
    const title = document.querySelector("#detailMediaTitle");
    if (image) image.src = galleryButton.dataset.gallerySrc;
    if (title) title.textContent = galleryButton.dataset.galleryTitle || "Product Image";
    document.querySelectorAll("[data-gallery-src]").forEach((button) => button.classList.toggle("active", button === galleryButton));
    return;
  }

  const adjust = event.target.closest("[data-adjust]");
  if (!adjust) return;
  event.stopPropagation();
  const id = adjust.dataset.variant;
  setQty(id, getQty(id) + Number(adjust.dataset.adjust));
  if (Number(adjust.dataset.adjust) > 0) pulseCart();
}

function closeProductModal() {
  if (dom.productModal.open) dom.productModal.close();
  if (!dom.newsModal.open && !dom.orderDownloadModal.open) document.body.classList.remove("modal-open");
}

function addToCart(id) {
  setQty(id, getQty(id) + 1);
  pulseCart();
}

function setQty(id, requestedQty) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  const next = Math.max(0, Math.floor(Number.isFinite(requestedQty) ? requestedQty : 0));
  if (next === 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = next;
  }
  saveJson(CART_KEY, state.cart);
  renderCart();
  syncQtyControls();
}

function getQty(id) {
  return state.cart[id] || 0;
}

function cartLines() {
  return Object.entries(state.cart)
    .map(([id, qty]) => {
      const item = state.items.find((entry) => entry.id === id);
      if (!item) return null;
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
      <img src="${item.bottle}" alt="${escapeHtml(item.fullTitle)} bottle" />
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
  const ready = cartLines().length > 0 && dom.storeForm.checkValidity();
  dom.sendOrder.disabled = !ready;
  dom.orderHint.textContent = ready ? "Ready to send to the server inbox" : "Add products, contact info, and shipping address to send order";
}

function openCartDrawer() {
  renderCart();
  document.body.classList.add("cart-open");
  document.body.classList.remove("nav-open");
}

function closeCartDrawer() {
  document.body.classList.remove("cart-open");
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
  const lines = cartLines();
  const order = buildClientOrder(lines);
  const shouldSend = await askDownloadBeforeSend(order);
  if (!shouldSend) return;

  const previous = dom.sendOrder.textContent;
  dom.sendOrder.disabled = true;
  dom.sendOrder.textContent = "Sending...";

  try {
    const result = await sendOrderToServer(order);
    const savedOrder = result.order || order;
    state.orders = [savedOrder, ...state.orders.filter((entry) => entry.id !== savedOrder.id)].slice(0, 500);
    saveJson(ORDERS_KEY, state.orders);
    state.cart = {};
    localStorage.removeItem(CART_KEY);
    renderCart();
    renderAdminOrders();
    closeCartDrawer();
    showToast(result.message || "Order request received and cart cleared");
  } catch (error) {
    showToast(error?.message || "Order could not be sent");
  } finally {
    dom.sendOrder.textContent = previous;
    updateOrderState();
  }
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

async function askDownloadBeforeSend(order) {
  dom.orderDownloadSummary.innerHTML = `
    <strong>${escapeHtml(order.store.storeName || "Store order")}</strong>
    <span>${order.totals.units} unit${order.totals.units === 1 ? "" : "s"} / ${money(order.totals.wholesale)}</span>
  `;

  return new Promise((resolve) => {
    const finish = (send, download) => {
      dom.downloadOrderCopy.removeEventListener("click", onDownload);
      dom.sendWithoutDownload.removeEventListener("click", onSendOnly);
      dom.cancelOrderSend.removeEventListener("click", onCancel);
      dom.orderDownloadModal.removeEventListener("cancel", onDialogCancel);
      if (download) downloadOrder(order);
      closeOrderDownloadModal();
      resolve(send);
    };
    const onDownload = () => finish(true, true);
    const onSendOnly = () => finish(true, false);
    const onCancel = () => finish(false, false);
    const onDialogCancel = (event) => {
      event.preventDefault();
      finish(false, false);
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

function downloadOrder(order) {
  const blob = new Blob([generateOrderPdf(order)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blackmarket-order-${safeFilePart(order.store.storeName)}-${today()}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
    let y = drawOrderItemHeader(ops);

    while (index < lines.length) {
      const row = orderLineForPdf(lines[index], index);
      const descLines = wrapPdfText(row.description, 160, 9);
      const rowHeight = Math.max(24, 12 + descLines.length * 11);
      if (y - rowHeight < 156 && index > 0) break;
      drawOrderItemRow(ops, row, descLines, y, rowHeight, index);
      y -= rowHeight;
      index += 1;
    }

    pages.push(ops);
  }

  drawOrderTermsAndTotals(pages[pages.length - 1], order);
  pages.forEach((ops, pageIndex) => drawOrderFooter(ops, order, pageIndex + 1, pages.length));
  return pages.map((ops) => ops.join("\n"));
}

function drawOrderPageHeader(ops, order) {
  const store = order.store || {};
  const addressLines = orderAddressLines(store);

  pdfText(ops, "Order Request", 582, 735, { size: 20, bold: true, align: "right" });
  pdfRect(ops, 30, 681, 76, 14);
  pdfText(ops, "BLACKMARKET", 68, 685, { size: 8.5, bold: true, align: "center", tracking: 1.6 });
  pdfText(ops, "BlackMarket, LLC", 110, 708, { size: 16, bold: true });
  ["Main", "3683 W 2270 S", "Ste D", "Salt Lake City, UT 84120-2308"].forEach((line, i) => {
    pdfText(ops, line, 110, 691 - i * 14, { size: 11 });
  });

  pdfTable(ops, 392, 684, [126, 70], 36, [
    ["Request #", "Date"],
    [orderRequestNumber(order), shortPdfDate(order.date)],
  ]);

  const billLines = [
    store.storeName || "Store order",
    store.street || "",
    [store.city, store.state, store.zip].filter(Boolean).join(", "),
    `Email: ${store.email || ""}`,
  ].filter(Boolean);
  const shipLines = [store.storeName || "Store order", ...addressLines].filter(Boolean);

  pdfLabeledBox(ops, 30, 538, 275, 78, "Bill To:", billLines);
  pdfLabeledBox(ops, 315, 552, 267, 64, "Ship To:", shipLines);
  pdfRect(ops, 315, 534, 267, 16);
  pdfText(ops, `Contact: ${store.contactName || store.storeName || ""}`, 319, 538, { size: 10.5 });
  pdfRect(ops, 30, 520, 275, 16);
  pdfText(ops, `Customer: ${store.storeName || ""}`, 34, 524, { size: 10.5 });

  pdfTable(ops, 30, 482, [94, 94, 94, 94, 94, 82], 30, [
    ["Sales Rep", "Payment Terms", "FOB Point", "Carrier", "Ship Service", "Date Scheduled"],
    ["pmart", "Due on Order", "Origin", "TBD", "Ground", shortPdfDate(order.date)],
  ]);
}

function drawOrderItemHeader(ops) {
  const x = 30;
  const y = 448;
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
  pdfText(ops, "Revision: 1", 306, 22, { size: 9, align: "center" });
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
  return [store.street, [store.city, store.state, store.zip].filter(Boolean).join(", ")].filter(Boolean);
}

function orderRequestNumber(order) {
  const id = String(order.id || "");
  return id ? `WEB-${id.slice(-6)}` : "PENDING";
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
  return date.toLocaleString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).replace(/\s/g, " ");
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
    product: item.productTitle,
    flavor: item.flavor,
    item: item.item,
    upc: item.upc,
    wholesale: item.wholesale,
    map: item.map,
    qty,
    lineWholesale,
    lineMap,
  };
}

async function loadServerOrders(options = {}) {
  if (!state.adminAuthed) return;
  try {
    const response = await fetch(ORDERS_API_URL, { headers: adminHeaders() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to load orders");
    state.orders = Array.isArray(body.orders) ? body.orders : [];
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

async function clearServerOrders() {
  try {
    const response = await fetch(ORDERS_API_URL, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || "Unable to clear orders");
    state.orders = [];
    saveJson(ORDERS_KEY, state.orders);
    renderAdminOrders();
    renderAdminMetrics();
    showToast("Order inbox cleared");
  } catch (error) {
    showToast(error?.message || "Unable to clear orders");
  }
}

function applyServerContent(content) {
  if (!content || typeof content !== "object") return false;
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
        customProducts: state.customProducts,
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
  return { "x-admin-pass": ADMIN_PASS };
}

function renderAdmin() {
  dom.adminLoginForm.hidden = state.adminAuthed;
  dom.adminPanel.hidden = !state.adminAuthed;
  renderAdminPages();
  renderAdminMetrics();
  renderAdminNews();
  renderAdminNewsPreview();
  renderAdminOrders();
  renderAdminProducts();
  renderProductEditor();
}

function setAdminSection(section) {
  state.activeAdminSection = ADMIN_SECTIONS.has(section) ? section : "orders";
  renderAdminPages();
  if (state.activeAdminSection === "orders") loadServerOrders({ silent: true });
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
  if (dom.adminCatalogProductCount) dom.adminCatalogProductCount.textContent = String(state.products.length);
  if (dom.adminCatalogVariantCount) {
    dom.adminCatalogVariantCount.textContent = String(state.products.reduce((total, product) => total + product.variants.length, 0));
  }
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

  if (id) {
    state.site.announcements = state.site.announcements.map((item) =>
      item.id === id ? { ...item, label, title, body, image, date, audience, ctaLabel, ctaUrl } : item,
    );
  } else {
    state.site.announcements.unshift({
      id: `${Date.now()}`,
      label,
      title,
      body,
      image,
      date,
      audience,
      ctaLabel,
      ctaUrl,
    });
  }

  clearAnnouncementEditor();
  await saveSite({ silent: true });
  renderAdminMetrics();
  showToast(id ? "Update saved" : "Announcement published");
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
        ${announcementImage(item, index) ? `<img src="${escapeHtml(announcementImage(item, index))}" alt="" />` : ""}
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.label || "Update")} / ${escapeHtml(item.date || "")}${item.audience ? ` / ${escapeHtml(item.audience)}` : ""}</span>
        </div>
        <div class="admin-news-actions">
          <button class="admin-button admin-secondary" type="button" data-edit-announcement="${item.id}">Edit</button>
          <button class="admin-button admin-danger" type="button" data-remove-announcement="${item.id}">Remove</button>
        </div>
      </article>
    `)
    .join("");
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
        </div>
      </div>
      <div class="admin-order-id">Order ID: ${escapeHtml(order.id || "")}</div>
      <div class="admin-order-contact">
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
  const status = dom.customProductStatus.value;
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
  showToast(parent ? `${flavor} added to ${parent.title}` : `${title} added to the catalog`);
}

async function removeCustomProduct(id) {
  const customProduct = state.customProducts.find((product) => product.id === id);
  const label = customProduct?.variants?.[0]?.flavor || customProduct?.title || "this custom item";
  if (!window.confirm(`Remove ${label} from the portal?`)) return;
  state.customProducts = state.customProducts.filter((product) => product.id !== id);
  saveJson(CUSTOM_PRODUCTS_KEY, state.customProducts);
  await persistAdminContent({ silent: true });
  rebuildProductState();
  renderAdminMetrics();
  showToast("Product removed");
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
    .map((product) => `
      <article class="admin-catalog-product">
        <header>
          <img src="${escapeHtml(product.variants[0]?.bottle || product.bottle || "")}" alt="" />
          <div class="admin-catalog-title">
            <strong>${escapeHtml(product.title)}</strong>
            <span>${escapeHtml(SECTION_META.find((entry) => entry.slug === adminSectionForProduct(product))?.label || product.category || "Catalog")}</span>
          </div>
          <div class="admin-catalog-actions">
            <b>${product.variants.length} flavor${product.variants.length === 1 ? "" : "s"}</b>
            <button class="admin-button admin-secondary admin-icon-action" type="button" data-select-product="${escapeHtml(product.id)}">Add Flavor</button>
          </div>
        </header>
        <div class="admin-variant-list">
          ${product.variants.map((variant) => `
            <div>
              <img src="${escapeHtml(variant.bottle || product.bottle || "")}" alt="" />
              <span>
                <strong>${escapeHtml(variant.flavor || "Unflavored")}</strong>
                <small>#${escapeHtml(variant.item || "TBD")} / ${escapeHtml(variant.wholesale || "")} / MAP ${escapeHtml(variant.map || "")}</small>
              </span>
              ${variant.limitedEdition ? `<em>Limited</em>` : ""}
              ${variant.customSourceId ? `<button class="admin-button admin-danger admin-icon-action" type="button" data-remove-product="${escapeHtml(variant.customSourceId)}">Remove</button>` : `<i>Live</i>`}
            </div>
          `).join("")}
        </div>
      </article>
    `)
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
  showToast("Uploading image...");
  const form = new FormData();
  form.append("file", file);
  form.append("scope", scope);
  const response = await fetch(ASSET_UPLOAD_URL, {
    method: "POST",
    headers: adminHeaders(),
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.message || "Image upload failed");
  return body.url;
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

async function saveSite(options = {}) {
  saveJson(SITE_KEY, state.site);
  renderAnnouncements();
  renderNews();
  renderAdminNews();
  return persistAdminContent(options);
}

function setView(view) {
  if (view === "cart") {
    openCartDrawer();
    return;
  }
  closeCartDrawer();
  closeProductModal();
  closeNewsModal();
  state.activeView = view;
  dom.views.forEach((section) => section.classList.toggle("active", section.id === `${view}View`));
  dom.navButtons.forEach((button) => {
    const active = button.dataset.view === view || (button.dataset.view === "landing" && view === "products");
    button.classList.toggle("active", active);
  });
  document.body.classList.remove("nav-open");
  document.body.dataset.view = view;
  if (view === "admin" && state.adminAuthed) {
    Promise.all([
      loadServerOrders({ silent: true }),
      loadServerContent({ silent: true }),
    ]);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pruneCart() {
  let changed = false;
  Object.keys(state.cart).forEach((id) => {
    if (!state.items.some((item) => item.id === id) || state.cart[id] <= 0) {
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
  localStorage.setItem(key, JSON.stringify(value));
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer = null;
function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("show"), 2200);
}
