# Product Assistant Data Audit — 2026-07-27

## Inventory

The wholesale portal contains 21 base product families and 56 repository variants. Production content adds RULE Dragon Punch, bringing the represented live variant count to 57.

1. CUTS Thermogenic Pre-workout
2. CUTS Natural Thermogenic Pre-workout
3. CUTS Diamond Ultra Thermogenic
4. CUTS PUMP Thermogenic Liquid Glycerol
5. CUTS PILLS Thermogenic Capsules
6. CUTS HEAT Stim-Free Thermogenic
7. SCORCH Ultra Thermogenic
8. TONE Weight-Loss Pre-workout
9. BULK Testosterone Pre-workout
10. BULK APEX Strength Pre-workout
11. BULK PILLS Testosterone Capsules
12. Beta-Alanine RAW
13. Creatine Monohydrate RAW
14. NOOTROPIC High Focus Pre-workout
15. UNDERGROUND High Stimulant
16. DEFY Hyper-Stimulant
17. RULE Hyper-Focus
18. BUMP Laser-Focus Nootropic
19. NITRICOXIDE Stim-Free Pre-workout
20. PUMP Hyper-Pump Pre-workout
21. L-Citrulline RAW

## Sources

- Identity, variants, flavors, item number, UPC, base wholesale, MAP, and media paths: `public/catalog-data.json`.
- Formula labels: product and variant `panel` assets under `public/assets`.
- Approved positioning and featured-ingredient copy: current official product pages at `blackmarketlabs.com`.
- Live custom variants, hidden IDs, media overrides, and variant status: private Vercel Blob `blackmarket/content.json`.
- Account prices: private store-account `priceOverrides`.
- Final price authority: `app/lib/catalog/pricing.ts`.

Every locally referenced bottle, card, panel, and gallery asset resolved during the audit.

## Conflicts and review requirements

- Item `56182` is used by both DEFY Razz Mango and RULE Razz Mango.
- Item `56277` is used by both DEFY Peach Rings and RULE Peach Rings.
- Item `56278` is used by both DEFY Watermelon Lemonade and RULE Watermelon Lemonade.
- DEFY STREETTARTS and RULE Dragon Punch do not have UPCs. The assistant uses stable variant IDs and does not require UPCs.
- RULE Dragon Punch was previously represented as both coming soon and available. Owner confirmation establishes it as available.
- DEFY Walter White Gummy Bear and RULE Purge Pop are owner-confirmed sold out.
- BUMP total caffeine conflicts between the official page and the current label presentation.
- BULK lacks a clear full Supplement Facts image in the portal, although the official product page verifies Creatine Monohydrate and 300 mg caffeine.
- NOOTROPIC needs a cleaner facts source for full exact-dosage transcription.
- CUTS, CUTS Natural, and TONE contain proprietary blends.
- CUTS PILLS contains caffeine anhydrous and guarana, so the 175 mg caffeine-an­hydrous row is not represented as confirmed total caffeine.
- `siteVariants` contains stale or inconsistent flavor names and is not assistant authority.
- No verified case packs, minimum quantities, free-unit rules, or numeric inventory counts exist.
- MAP exists; a separate suggested retail price does not.

## Verification result

The baseline distinguishes Verified records from Needs Review records. Missing or conflicting details are intentionally omitted from factual answers. Admin corrections are saved with editor identity and timestamp through the Assistant Knowledge workflow.
