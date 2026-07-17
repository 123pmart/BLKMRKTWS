// @ts-check

/** @typedef {{
 * id: string,
 * productTitle?: string,
 * flavor?: string,
 * item?: string,
 * upc?: string,
 * category?: string,
 * categorySlug?: string,
 * section?: string,
 * description?: string,
 * fullTitle?: string,
 * aliases?: string[],
 * sort?: number
 * }} SearchableCatalogItem
 */

/**
 * Search the already-visible catalog inventory. Hidden and inactive variants
 * are excluded upstream when flattened, so this selector cannot reintroduce
 * them. Coming-soon items remain present with their existing status.
 *
 * @template {SearchableCatalogItem} T
 * @param {T[]} items
 * @param {string} query
 * @returns {T[]}
 */
export function searchCatalogItems(items, query) {
  const normalizedQuery = normalizeCatalogSearch(query);
  if (!normalizedQuery) return [...items];

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return items
    .map((item, originalIndex) => ({ item, originalIndex, rank: rankCatalogItem(item, normalizedQuery, tokens) }))
    .filter((result) => Number.isFinite(result.rank))
    .sort((a, b) => a.rank - b.rank || Number(a.item.sort || 0) - Number(b.item.sort || 0) || a.originalIndex - b.originalIndex)
    .map((result) => result.item);
}

/**
 * @param {SearchableCatalogItem} item
 * @param {string} query
 * @param {string[]} tokens
 */
function rankCatalogItem(item, query, tokens) {
  const product = normalizeCatalogSearch(item.productTitle);
  const flavor = normalizeCatalogSearch(item.flavor);
  const itemNumber = normalizeCatalogSearch(item.item);
  const upc = normalizeCatalogSearch(item.upc);
  const category = normalizeCatalogSearch([item.category, item.categorySlug, item.section].filter(Boolean).join(" "));
  const aliases = uniqueCatalogTerms([
    ...(Array.isArray(item.aliases) ? item.aliases : []),
    ...catalogFlavorAliases(item.flavor || ""),
  ]).join(" ");
  const searchable = normalizeCatalogSearch([
    product,
    flavor,
    itemNumber,
    upc,
    category,
    aliases,
    item.fullTitle,
    item.description,
  ].filter(Boolean).join(" "));

  if (!tokens.every((token) => searchable.includes(token))) return Number.POSITIVE_INFINITY;
  if (itemNumber === query || upc === query) return 0;
  if (product === query) return 5;
  if (flavor === query) return 8;
  if (product.startsWith(query)) return 12;
  if (flavor.startsWith(query)) return 16;
  if (itemNumber.startsWith(query) || upc.startsWith(query)) return 20;
  if (aliases.split(" ").includes(query)) return 24;
  if (category.includes(query)) return 32;
  if (searchable.includes(query)) return 40;
  return 50 + tokens.reduce((score, token) => score + searchable.indexOf(token), 0);
}

/** @param {string} flavor */
export function catalogFlavorAliases(flavor) {
  const base = normalizeCatalogSearch(flavor);
  const compact = base.replace(/\s+/g, "");
  const aliases = [base, compact];
  if (base.includes("blue") && base.includes("razz")) aliases.push("bluerazz");
  if (base.includes("candy") && base.includes("dust")) aliases.push("candydust");
  if (base.includes("candy") && base.includes("road")) aliases.push("candyroad");
  if (base.includes("fruit") && base.includes("punch")) aliases.push("fruitpunch");
  if (base.includes("grape") && base.includes("lime")) aliases.push("glr", "grapelime");
  if (base.includes("razz") && base.includes("mango")) aliases.push("razzmango");
  if (base.includes("raspberry") && base.includes("lemonade")) aliases.push("rasplem");
  if (base.includes("sour") && base.includes("gummy")) aliases.push("sourgum");
  if (base.includes("strawberry") && base.includes("kiwi")) aliases.push("strwkiwi");
  if (base.includes("strawberry") && base.includes("lemonade")) aliases.push("strawlem");
  if (base.includes("watermelon") && base.includes("lemonade")) aliases.push("waterlem", "watlem");
  return uniqueCatalogTerms(aliases);
}

/** @param {unknown} value */
export function normalizeCatalogSearch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** @param {string[]} values */
function uniqueCatalogTerms(values) {
  return [...new Set(values.map(normalizeCatalogSearch).filter(Boolean))];
}
