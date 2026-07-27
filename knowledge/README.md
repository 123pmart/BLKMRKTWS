# BLACKMARKET AI Knowledge System

This directory is the canonical, generated product-intelligence layer used by the existing BLACKMARKET AI route.

## Source of truth and precedence

Formula facts follow this order:

1. Current Supplement Facts label stored in the portal
2. BLACKMARKET 2026 catalog
3. Wholesale portal catalog for variants, item numbers, price, and availability
4. Current official product page for purpose, positioning, directions, warnings, consumer flavors, and an official total-caffeine statement
5. Older owner-supplied product guides only when a current label does not supersede them

The current DEFY, RULE, UNDERGROUND, and NOOTROPIC labels supersede older formula pages. Conflicting older amounts must not be merged into the current record.

## Directory layout

- `products/`: one normalized record per product
- `ingredients/`: one normalized record per disclosed ingredient
- `comparisons/`: dedicated formula and positioning comparisons
- `stacks/`: compatibility, overlap, and caution records
- `faq/`: reserved for hand-authored FAQ source additions
- `sales/`: deterministic retailer recommendation source additions
- `sources/`: source policy and crawl/source inventory
- `research/`: audit reports, research notes, and unresolved gaps
- `exports/`: generated aggregate JSON, runtime TypeScript, benchmarks, and audit results

## Updating the knowledge base

1. Update the verified source record in `app/lib/assistant/knowledge-data.ts`.
2. Add or update the source location in `scripts/build-knowledge.ts`.
3. Never assign an amount to an ingredient whose label only lists it inside a proprietary blend.
4. Run:

```bash
npm run knowledge:build
npm run knowledge:audit
npm run knowledge:test
```

5. Review `knowledge/research/AUDIT.md` and `knowledge/exports/benchmark-results.json`.
6. Run the full project test, lint, typecheck, and build before release.

## Proprietary blend rule

An ingredient inside a proprietary blend is stored with:

- `amount: null`
- `amountStatus: "proprietary_unknown"`
- the blend name and total
- its label order
- source IDs and confidence

The assistant may report presence and label order, but it must never estimate an individual amount.

## Retrieval

Runtime retrieval combines:

- exact product/alias matching
- misspelling matching
- normalized ingredient matching
- local synonym expansion
- sparse-vector similarity over generated chunks
- dedicated comparison-pair boosts
- current-label and source-confidence boosts
- intent-specific reranking

No paid AI API or remote embedding service is used. Answer composition is deterministic and draws from the retrieved canonical records.

## Adding a new product

Add the product to the portal catalog first, then add a verified knowledge blueprint with the current facts-label source. Include aliases, purpose, ideal/poor fit, formula, exact/proprietary amount status, relationships, and prohibited claims. Rebuild the exports and add benchmark questions that require its defining facts.

## Known limitation

The assistant can accurately report official label facts and formula comparisons. Many botanical or branded materials do not have a reliable, single evidence-supported dosage range stored. Those records intentionally explain the limitation instead of inventing a threshold.
