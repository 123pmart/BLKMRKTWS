# BLACKMARKET AI Architecture

## Original root cause

The original assistant had useful product fields, but the response layer discarded most of them. Comparisons were produced by `concisePositioning`, `conciseDifference`, and `conciseFormula`, which reduced products to a category sentence, two differentiators, and at most six ingredients. The React view truncated comparisons to two lines and other answers to three or eight lines. There was no chunk retrieval, source-aware reranking, dedicated comparison record, or ingredient intelligence layer.

## Current flow

1. The React assistant sends the question, short session context, and current local cart to `/api/assistant/answer`.
2. The server verifies that BLACKMARKET AI is released or that the requester has an admin preview session.
3. The server resolves account-specific catalog pricing.
4. Product and ingredient entities are detected with exact aliases, common misspellings, and local fuzzy matching.
5. Local hybrid retrieval searches canonical product, formula, ingredient, comparison, FAQ, stack, and sales chunks.
6. Reranking prioritizes exact product pairs, current labels, formula chunks, and high-confidence sources.
7. Deterministic answer composition creates a verdict, formula differences, expected positioning/experience, buyer fit, tradeoffs, and bottom line.
8. Cart changes remain confirmation-based and continue to use the existing cart state. Final order submission remains server-repriced.

The answer API is `private, no-store` and same-origin. Customer routes no longer bundle the generated knowledge engine into browser JavaScript.

## Development diagnostics

Set `ASSISTANT_DEBUG=true`, or run Next in development, to log:

- detected intent
- detected products and ingredients
- retrieved chunk IDs
- reranking reasons and scores
- source confidence

## Release control

BLACKMARKET AI remains controlled by the persisted admin release switch. Admins can test it while customer access is disabled.

## Formula updates

Update the verified blueprint and source inventory, then run the three knowledge scripts. Do not hand-edit generated exports; they will be replaced by the build.
