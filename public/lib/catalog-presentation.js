// Display-only names. Original catalog titles remain authoritative for search,
// order records, PDFs, and administration.
const productNames = {
  "cuts-thermogenic-pre-workout": "CUTS",
  "cuts-natural-thermogenic-pre-workout": "CUTS Natural",
  "cuts-diamond-ultra-thermogenic": "CUTS Diamond",
  "cuts-pump-thermogenic-liquid-glycerol": "CUTS PUMP",
  "cuts-pills-thermogenic-capsules": "CUTS PILLS",
  "cuts-heat-stim-free-thermogenic": "CUTS HEAT",
  "scorch-ultra-thermogenic": "SCORCH",
  "tone-weight-loss-pre-workout": "TONE",
  "bulk-testosterone-pre-workout": "BULK",
  "bulk-apex-strength-pre-workout": "BULK APEX",
  "bulk-pump-strength-liquid-glycerol": "BULK PUMP",
  "bulk-pills-testosterone-capsules": "BULK PILLS",
  "beta-alanine-raw": "Beta-Alanine RAW",
  "creatine-monohydrate-raw": "Creatine RAW",
  "nootropic-high-focus-pre-workout": "NOOTROPIC",
  "underground-high-stimulant": "UNDERGROUND",
  "defy-hyper-stimulant": "DEFY",
  "rule-hyper-focus": "RULE",
  "bump-laser-focus-nootropic": "BUMP",
  "nitricoxide-stim-free-pre-workout": "NITRICOXIDE",
  "pump-hyper-pump-pre-workout": "PUMP",
  "l-citrulline-raw": "L-Citrulline RAW",
};

/** Extract only an explicit container serving count, never an ingredient dose. */
export function catalogServingCount(description = "") {
  const match = String(description).match(/\b(\d+(?:\s*\/\s*\d+)?)\s*serv(?:ings?)?\b/i);
  return match ? match[1].replace(/\s/g, "") : "";
}

/** Shared, non-mutating presentation for cards, details, and the cart. */
export function catalogPresentation(product = {}, variant = {}) {
  const displayName = productNames[product.extendsProductId || product.id] || String(product.title || "Product").trim();
  const flavor = String(variant.flavor || "").trim();
  let servings = catalogServingCount(variant.description);
  if (!servings) {
    // An admin-added flavor can inherit an explicitly consistent parent count.
    // Never choose between conflicting counts or invent one for a new product.
    const counts = new Set((product.variants || []).map((entry) => catalogServingCount(entry.description)).filter(Boolean));
    if (counts.size === 1) servings = [...counts][0];
  }
  return {
    displayName,
    displayTitle: flavor ? `${displayName} | ${flavor}` : displayName,
    servingsLabel: servings ? `${servings} ${servings === "1" ? "Serving" : "Servings"}` : "",
  };
}
