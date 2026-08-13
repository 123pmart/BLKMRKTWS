const VALID_CATALOG_SECTIONS = new Set(["thermogenics", "focus", "pump", "strength", "raws"]);

export function normalizeCatalogSectionSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (slug === "thermogenic") return "thermogenics";
  return VALID_CATALOG_SECTIONS.has(slug) ? slug : "";
}

export function catalogItemSections(product, primarySection) {
  const configured = Array.isArray(product?.categorySlugs) ? product.categorySlugs : [];
  return [...new Set([primarySection, ...configured, product?.categorySlug]
    .map(normalizeCatalogSectionSlug)
    .filter(Boolean))];
}

export function catalogItemMatchesSection(item, section) {
  if (section === "all") return true;
  const sections = Array.isArray(item?.sections) && item.sections.length ? item.sections : [item?.section];
  return sections.map(normalizeCatalogSectionSlug).includes(normalizeCatalogSectionSlug(section));
}
