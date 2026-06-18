const DATA_URL = "/catalog-data.json?v=20260618-liquid-glass-mobile";
const CATALOG_PAGES_URL = "/catalog-pages.json?v=20260618-liquid-glass-mobile";
const ORDERS_API_URL = "/api/orders";
const ORDER_SUBMIT_URL = "/api/send-order";
const CART_KEY = "blackmarket-wholesale-cart-v4";
const STORE_KEY = "blackmarket-wholesale-store-v3";
const SITE_KEY = "blackmarket-wholesale-site-v1";
const ADMIN_KEY = "blackmarket-wholesale-admin-v1";
const ORDERS_KEY = "blackmarket-wholesale-orders-v1";
const CUSTOM_PRODUCTS_KEY = "blackmarket-wholesale-custom-products-v1";

const ADMIN_USER = "pmart";
const ADMIN_PASS = "123pmart";
const MEDIA_PRELOAD_CONCURRENCY = 8;

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
  orderStorageMode: "local fallback",
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
  announcementForm: document.querySelector("#announcementForm"),
  announcementId: document.querySelector("#announcementId"),
  announcementLabel: document.querySelector("#announcementLabel"),
  announcementDate: document.querySelector("#announcementDate"),
  announcementAudience: document.querySelector("#announcementAudience"),
  announcementTitle: document.querySelector("#announcementTitle"),
  announcementBody: document.querySelector("#announcementBody"),
  announcementImage: document.querySelector("#announcementImage"),
  announcementCtaLabel: document.querySelector("#announcementCtaLabel"),
  announcementCtaUrl: document.querySelector("#announcementCtaUrl"),
  announcementSubmit: document.querySelector("#announcementSubmit"),
  announcementCancel: document.querySelector("#announcementCancel"),
  adminNewsList: document.querySelector("#adminNewsList"),
  adminOrdersList: document.querySelector("#adminOrdersList"),
  adminOrderCount: document.querySelector("#adminOrderCount"),
  adminOrderRevenue: document.querySelector("#adminOrderRevenue"),
  adminProductCount: document.querySelector("#adminProductCount"),
  adminNewsCount: document.querySelector("#adminNewsCount"),
  adminStorageMode: document.querySelector("#adminStorageMode"),
  adminLogout: document.querySelector("#adminLogout"),
  customProductForm: document.querySelector("#customProductForm"),
  customProductTitle: document.querySelector("#customProductTitle"),
  customProductSection: document.querySelector("#customProductSection"),
  customProductFlavor: document.querySelector("#customProductFlavor"),
  customProductItem: document.querySelector("#customProductItem"),
  customProductUpc: document.querySelector("#customProductUpc"),
  customProductCasePack: document.querySelector("#customProductCasePack"),
  customProductStatus: document.querySelector("#customProductStatus"),
  customProductWholesale: document.querySelector("#customProductWholesale"),
  customProductMap: document.querySelector("#customProductMap"),
  customProductBottle: document.querySelector("#customProductBottle"),
  customProductPanel: document.querySelector("#customProductPanel"),
  customProductImages: document.querySelector("#customProductImages"),
  customProductHighlights: document.querySelector("#customProductHighlights"),
  customProductDescription: document.querySelector("#customProductDescription"),
  customProductNotes: document.querySelector("#customProductNotes"),
  adminProductsList: document.querySelector("#adminProductsList"),
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
  const [response, catalogResponse] = await Promise.all([fetch(DATA_URL), fetch(CATALOG_PAGES_URL).catch(() => null)]);
  const data = await response.json();
  const catalogData = catalogResponse?.ok ? await catalogResponse.json() : { pages: [] };
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
      loadServerOrders({ silent: true });
      showToast("Admin unlocked");
    } else {
      showToast("Invalid admin login");
    }
  });

  dom.announcementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    publishAnnouncement();
  });

  dom.announcementCancel.addEventListener("click", clearAnnouncementEditor);

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

  dom.customProductForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addCustomProduct();
  });

  dom.adminProductsList.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-product]");
    if (!remove) return;
    removeCustomProduct(remove.dataset.removeProduct);
  });

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
  return [...state.baseProducts, ...state.customProducts];
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
  const filters = [...SECTION_META, { slug: "all", label: "All Products" }];
  dom.categoryNav.innerHTML = filters
    .map((filter) => {
      const active = state.activeFilter === filter.slug ? "active" : "";
      return `<button class="${active}" type="button" data-filter="${filter.slug}">${escapeHtml(filter.label)}</button>`;
    })
    .join("");
}

function setProductFilter(filter, options = {}) {
  state.activeFilter = filter;
  if (!options.keepQuery) {
    state.query = "";
    dom.search.value = "";
  }
  renderCategoryNav();
  renderCatalog();
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

function renderCatalog() {
  const items = filteredItems();
  if (dom.catalogCount) dom.catalogCount.textContent = String(items.length);
  if (!items.length) {
    dom.catalog.innerHTML = `<div class="empty-state">No products found.</div>`;
    return;
  }

  dom.catalog.innerHTML = `
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
        <span>${escapeHtml(item.flavor)}</span>
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
            <p class="eyebrow">#${escapeHtml(item.item)}</p>
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
    showToast(result.message || "Order sent and cart cleared");
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
  const blob = new Blob([formatOrderForDownload(order)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blackmarket-order-${safeFilePart(order.store.storeName)}-${today()}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function adminHeaders() {
  return { "x-admin-pass": ADMIN_PASS };
}

function renderAdmin() {
  dom.adminLoginForm.hidden = state.adminAuthed;
  dom.adminPanel.hidden = !state.adminAuthed;
  renderAdminMetrics();
  renderAdminNews();
  renderAdminOrders();
  renderAdminProducts();
}

function renderAdminMetrics() {
  if (!state.adminAuthed) return;
  const revenue = state.orders.reduce((total, order) => total + Number(order.totals?.wholesale || 0), 0);
  if (dom.adminOrderCount) dom.adminOrderCount.textContent = String(state.orders.length);
  if (dom.adminOrderRevenue) dom.adminOrderRevenue.textContent = money(revenue);
  if (dom.adminProductCount) dom.adminProductCount.textContent = String(state.customProducts.length);
  if (dom.adminNewsCount) dom.adminNewsCount.textContent = String(state.site.announcements.length);
  if (dom.adminStorageMode) dom.adminStorageMode.value = `${state.orderStorageMode} inbox`;
}

function publishAnnouncement() {
  const id = dom.announcementId.value.trim();
  const title = dom.announcementTitle.value.trim();
  const body = dom.announcementBody.value.trim();
  const label = dom.announcementLabel.value.trim() || "Update";
  const date = dom.announcementDate.value || today();
  const audience = dom.announcementAudience.value.trim();
  const image = dom.announcementImage.value.trim();
  const ctaLabel = dom.announcementCtaLabel.value.trim();
  const ctaUrl = dom.announcementCtaUrl.value.trim();
  if (!title || !body) return;

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
  saveSite();
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
          <button type="button" data-edit-announcement="${item.id}">Edit</button>
          <button type="button" data-remove-announcement="${item.id}">Remove</button>
        </div>
      </article>
    `)
    .join("");
}

function renderAdminOrders() {
  if (!state.adminAuthed || !dom.adminOrdersList) return;
  if (!state.orders.length) {
    dom.adminOrdersList.innerHTML = `
      <div class="admin-order-toolbar">
        <span>No server orders yet</span>
        <button type="button" data-refresh-orders>Refresh Inbox</button>
      </div>
      <div class="empty-state">No orders submitted yet.</div>
    `;
    return;
  }
  dom.adminOrdersList.innerHTML = `
    <div class="admin-order-toolbar">
      <span>${state.orders.length} order${state.orders.length === 1 ? "" : "s"}</span>
      <button type="button" data-refresh-orders>Refresh Inbox</button>
      <button type="button" data-clear-orders>Clear Inbox</button>
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
          <button type="button" data-download-order="${escapeHtml(order.id)}">Download</button>
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

function addCustomProduct() {
  const title = dom.customProductTitle.value.trim();
  const section = dom.customProductSection.value;
  const flavor = dom.customProductFlavor.value.trim();
  const status = dom.customProductStatus.value;
  const itemNumber = dom.customProductItem.value.trim();
  const upc = dom.customProductUpc.value.trim();
  const casePack = dom.customProductCasePack.value.trim();
  const bottle = dom.customProductBottle.value.trim();
  const panel = dom.customProductPanel.value.trim();
  const wholesaleValue = parseMoney(dom.customProductWholesale.value);
  const mapValue = parseMoney(dom.customProductMap.value) || 0;
  const description = dom.customProductDescription.value.trim();
  if (!title || !section || !flavor || !itemNumber || !bottle || !panel || !description || wholesaleValue <= 0 || mapValue <= 0) {
    showToast("Complete required product fields before adding");
    return;
  }

  const productId = `custom-${slugify(title)}-${Date.now()}`;
  const variantId = `${productId}-${slugify(flavor)}`;
  const sectionMeta = SECTION_META.find((entry) => entry.slug === section) || SECTION_META[0];
  const extraImages = splitImageList(dom.customProductImages.value);
  const highlights = splitImageList(dom.customProductHighlights.value);
  const adminNotes = dom.customProductNotes.value.trim();
  const product = {
    id: productId,
    custom: true,
    title,
    category: sectionMeta.label,
    categorySlug: section,
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
        available: status === "available",
      },
    ],
  };

  state.customProducts.unshift(product);
  saveJson(CUSTOM_PRODUCTS_KEY, state.customProducts);
  dom.customProductForm.reset();
  rebuildProductState();
  renderAdminMetrics();
  showToast("Product added");
}

function removeCustomProduct(id) {
  state.customProducts = state.customProducts.filter((product) => product.id !== id);
  saveJson(CUSTOM_PRODUCTS_KEY, state.customProducts);
  rebuildProductState();
  renderAdminMetrics();
  showToast("Product removed");
}

function renderAdminProducts() {
  if (!state.adminAuthed || !dom.adminProductsList) return;
  if (!state.customProducts.length) {
    dom.adminProductsList.innerHTML = `<div class="empty-state">No custom products added yet.</div>`;
    return;
  }

  dom.adminProductsList.innerHTML = state.customProducts
    .map((product) => {
      const variant = product.variants[0] || {};
      return `
        <article>
          <img src="${escapeHtml(variant.bottle || product.bottle)}" alt="" />
          <div>
            <strong>${escapeHtml(product.title)}</strong>
            <span>${escapeHtml(variant.flavor || "")} / ${escapeHtml(product.category || "")} / ${escapeHtml(variant.status || "available")}</span>
            <small>#${escapeHtml(variant.item || "CUSTOM")}${variant.upc ? ` / UPC ${escapeHtml(variant.upc)}` : ""}${variant.casePack ? ` / ${escapeHtml(variant.casePack)}` : ""}</small>
          </div>
          <button type="button" data-remove-product="${escapeHtml(product.id)}">Remove</button>
        </article>
      `;
    })
    .join("");
}

function announcementImage(item, index = 0) {
  return item.image || defaultSite.announcements[index % defaultSite.announcements.length]?.image || "";
}

function editAnnouncement(id) {
  const item = state.site.announcements.find((entry) => entry.id === id);
  if (!item) return;
  dom.announcementId.value = item.id;
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
  dom.announcementTitle.focus();
}

function clearAnnouncementEditor() {
  dom.announcementForm.reset();
  dom.announcementId.value = "";
  dom.announcementDate.value = today();
  dom.announcementSubmit.textContent = "Publish Update";
  dom.announcementCancel.hidden = true;
}

function saveSite() {
  saveJson(SITE_KEY, state.site);
  renderAnnouncements();
  renderNews();
  renderAdminNews();
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
  if (view === "admin" && state.adminAuthed) loadServerOrders({ silent: true });
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
