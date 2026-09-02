// Reconciled with the master order form on 2026-09-02 (Sheet1, rows below).
// Match stable variant IDs, NEVER a stale/non-unique item number. IDs remain
// unchanged to preserve carts, store-specific prices, images, and order links.
// See docs/catalog-identifiers.md for the full reconciliation and exclusions.
const corrections = [
  {
    "id": "bulk-pump-strength-liquid-glycerol-sour-gummy-56339",
    "item": "56331",
    "upc": "810055901579",
    "sourceRow": 46
  },
  {
    "id": "bulk-pump-strength-liquid-glycerol-rocket-pop-56340",
    "item": "56332",
    "upc": "810055901586",
    "sourceRow": 47
  },
  {
    "id": "defy-hyper-stimulant-razz-mango-sherbert-56182",
    "item": "56281",
    "upc": "810055901180",
    "sourceRow": 67
  },
  {
    "id": "defy-hyper-stimulant-streettarts-56329",
    "item": "56329",
    "upc": "810055901593",
    "sourceRow": 68
  },
  {
    "id": "rule-hyper-focus-peach-rings-56277",
    "item": "56284",
    "upc": "810055901210",
    "sourceRow": 70
  },
  {
    "id": "rule-hyper-focus-watermelon-lemonade-56278",
    "item": "56283",
    "upc": "810055901203",
    "sourceRow": 71
  },
  {
    "id": "rule-hyper-focus-razz-mango-sherbert-56182",
    "item": "56282",
    "upc": "810055901197",
    "sourceRow": 72
  },
  {
    "id": "extension-rule-hyper-focus-dragon-punch-1783533527232-dragon-punch",
    "item": "56330",
    "upc": "810055901609",
    "sourceRow": 73
  }
];

/**
 * Current supplier identifiers for built-in and admin-managed variants.
 * Unlisted variants retain their existing identifiers; no UPC is guessed.
 * @param {{ id?: string, item?: string, upc?: string }} variant
 * @returns {{ item: string, upc: string }}
 */
export function catalogIdentifiers(variant) {
  const correction = corrections.find((entry) => entry.id === variant.id);
  return {
    item: correction?.item ?? String(variant.item ?? "").trim(),
    upc: correction?.upc ?? String(variant.upc ?? "").trim(),
  };
}
