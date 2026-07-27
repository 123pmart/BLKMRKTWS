# BLACKMARKET Product Assistant

## Purpose

The Product Assistant is a deterministic product-knowledge system for wholesale buyers. It does not call OpenAI, Anthropic, Gemini, or another generative AI service.

The assistant combines:

- the server-resolved wholesale catalog;
- authenticated account pricing;
- current portal availability overrides;
- curated formula and retailer-positioning records;
- normalized product, flavor, ingredient, alias, and misspelling matching;
- deterministic intent, comparison, recommendation, and cart-action rules;
- prewritten response structures and explicit accuracy guardrails.

The customer interface is a React-owned App Router route at `/assistant`. The remaining customer catalog is still served by the legacy compatibility document.

## Main modules

- `app/lib/assistant/types.ts`: knowledge, source, runtime-product, response, context, and cart-action contracts.
- `app/lib/assistant/knowledge-data.ts`: reviewed baseline knowledge linked to portal labels and official BlackMarketLabs product pages.
- `app/lib/assistant/catalog.ts`: merges knowledge with the live catalog, status overrides, and authenticated account pricing.
- `app/lib/assistant/engine.ts`: local entity recognition, intent classification, verified query logic, comparisons, recommendations, and cart-action planning.
- `app/components/assistant/product-assistant.tsx`: conversation UI, product cards, confirmations, undo, and the legacy-cart adapter.
- `app/admin/assistant/page.tsx`: authenticated Assistant Knowledge review route.
- `app/api/admin/assistant-knowledge/route.ts`: same-origin, admin-authenticated knowledge persistence.
- `app/lib/assistant/question-library.ts`: structured library of at least 150 wholesale questions.

## Accuracy model

Formula data has one of four states: `unverified`, `needs-review`, `verified`, or `archived`.

Only positive facts with an identified source are included. The assistant will not infer absent ingredients from an incomplete formula. Ingredient-exclusion answers only include products whose complete formula is marked `verified`.

Amounts distinguish exact disclosed dosage, proprietary blend total, ingredient listed in a proprietary blend, and an official product-page highlight without an exact dosage.

Full-serving caffeine is stored separately from the weights of individual caffeine-source ingredients. This prevents ingredient weight from being mistaken for caffeine yield.

Current known review items:

- BULK: official ingredients and 300 mg caffeine are verified, but a clear current Supplement Facts image is still needed for all exact dosages.
- NOOTROPIC: official featured ingredients and 350 mg caffeine are verified; remaining exact dosages need a clean label review.
- BUMP: the official page says 80 mg total caffeine while the current two-scoop label appears to show 80 mg from each of two sources. No total is presented as verified.
- CUTS, CUTS Natural, and TONE contain proprietary blends. Undisclosed individual dosages remain undisclosed.
- CUTS PILLS has 175 mg caffeine anhydrous plus guarana; a total-caffeine value is not claimed.

## Status policy

Recommendations use currently available, non-hidden variants only. Sold-out, hidden, inactive, and coming-soon variants remain available for explicit status questions but are not recommended or added to the cart.

Owner-confirmed statuses:

- RULE Dragon Punch: available.
- DEFY Walter White Gummy Bear: sold out.
- RULE Purge Pop: sold out.

## Adding a product

1. Add the product and stable variants to the existing catalog/content workflow.
2. Add one `ProductKnowledgeBlueprint` to `knowledge-data.ts`.
3. Link every factual formula field to a `SourceReference`.
4. Keep the formula `needs-review` until a clear current Supplement Facts source is checked.
5. Add product aliases and common misspellings.
6. Add approved comparisons, complements, and substitutes using stable product IDs.
7. Add representative questions to the question library.
8. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Updating a formula

Use `/admin/assistant`:

1. Select the product.
2. Compare the structured rows with the displayed source references.
3. Update serving data, caffeine, ingredients, amounts, roles, disclosure types, and review notes.
4. Matt and Beau can save corrections as Unverified or Needs Review.
5. Parker can mark product and formula records Verified.

Admin edits are stored as `assistantKnowledge` inside the existing durable content record. Public `/api/content` responses omit this internal editing data.

## Aliases and intents

Product aliases live with the product blueprint. Ingredient synonyms and question intents live in `engine.ts`.

Intent priority matters. Cart mutations, medical guardrails, comparisons, formula searches, status, pricing, and recommendations are resolved in a deliberate order. Add a new intent only with unambiguous phrase rules, an explicit response type, false-positive tests, and fixtures in the question library.

## Recommendation scoring

Recommendations are explainable:

- a product receives five points for each matching approved goal;
- experienced/high-stim wording adds points only when verified full-serving caffeine is at least 350 mg;
- caffeine-sensitive wording strongly favors verified stimulant-free products;
- ties use current MAP margin only as a secondary wholesale factor.

Unavailable products are excluded. The assistant displays the matching reasons instead of claiming a personalized health outcome.

## Cart integration

The assistant does not create another cart. It reads and writes the current `blackmarket-wholesale-cart-v4` map using stable variant IDs, then emits `blackmarket:cart-updated` so existing navigation badges update.

All natural-language cart actions first produce a pending action. The user must confirm it. Supported actions include add, remove, set quantity, unambiguous product replacement, cart summary, category-coverage analysis, and one-step undo.

Case quantities are intentionally unsupported until verified case packs exist. Order submission still uses the existing server catalog to reprice and validate every line.

## Follow-up context

Current compared product and variant IDs live only in React state. Recent question text is stored in `sessionStorage`, not durable account data. The assistant can resolve follow-ups such as “Which one has more caffeine?” after a comparison.

No customer names, email addresses, shipping details, or medical information are used for assistant analytics.

## Testing

`tests/product-assistant.test.mjs` covers exact/alias/misspelling matching, product/ingredient ambiguity, comparisons, caffeine ranking, ingredient inclusion and safe exclusion, stimulant-free filtering, pricing and margin, flavor status, follow-up context, cart actions, cart totals, case refusal, and medical guardrails.

## Known limitations

- This is deterministic language matching, not open-ended generative language understanding.
- Ambiguous variants require clarification.
- No verified case quantities exist.
- No cross-device conversation history is stored.
- Recommendation scoring reflects approved product positioning, not individualized medical suitability.
- The legacy catalog and cart still load `public/app.js`; `/assistant` itself does not.
- The Assistant Knowledge editor is React-owned, while the main `/admin` dashboard remains legacy.
