# Catalog identifier reconciliation — 2026-09-02

Source: `BlackMarket Master UPC & Order Form (Pricing & MAP) (2).xlsx`, Sheet1.
Only Supplier Item# (column A) and Unit UPC (column F) were changed; product descriptions (column B) were checked to establish identity. Pricing, availability, images, and all stable product/variant IDs are unchanged.

## Coverage

- 56 populated master product rows reconciled: 55 built-in variants plus the live admin-managed RULE Dragon Punch.
- 8 variants corrected; 48 already matched.
- All 56 supplied UPCs have 12 digits and valid UPC-A check digits.
- Compared against the public production content API to include the admin-created Dragon Punch record. No production content was written during this reconciliation.
- Source cells are recorded in `tests/fixtures/master-identifiers-2026-09-02.json`. The workbook itself is not copied into the public site.

## Corrections

| Product / flavor | Master row | Previous item | Correct item | Correct UPC |
| --- | --- | --- | --- | --- |
| BULK PUMP - Strength Liquid Glycerol Sour Gummy 30/60 Serv | 46 | 56339 | 56331 | 810055901579 |
| BULK PUMP - Strength Liquid Glycerol Rocket Pop 30/60 Serv | 47 | 56340 | 56332 | 810055901586 |
| DEFY Hyper Stimulant Pre-workout Razz Mango Sherbet 20/40 Serv | 67 | 56182 | 56281 | 810055901180 |
| DEFY Hyper Stimulant Pre-workout LE Street Tarts 20/40 Serv | 68 | 56329 | 56329 | 810055901593 |
| RULE Hyper Focus Pre-workout Peach Rings 20/40 Serv | 70 | 56277 | 56284 | 810055901210 |
| RULE Hyper Focus Pre-workout Watermelon Lemonade 20/40 Serv | 71 | 56278 | 56283 | 810055901203 |
| RULE Hyper Focus Pre-workout  Razz Mango Sherbet 20/40 Serv | 72 | 56182 | 56282 | 810055901197 |
| RULE Hyper Focus Pre-workout LE Dragon Punch | 73 | 56330 | 56330 | 810055901609 |

The four previously blank UPCs belong to both BULK PUMP flavors, DEFY Street Tarts, and RULE Dragon Punch.

## Products not listed in the supplied workbook

These variants remain present and unchanged. Their identifiers cannot be verified against this workbook:

- BULK Original Blue Razz: item 51116, UPC 858113007061.
- DEFY White Gummy Bear: item 56298, UPC 810055901302.
- RULE Purge Pop: item 56299, UPC 810055901319.

A missing spreadsheet row is not treated as an instruction to delete or deactivate a product.

## Runtime behavior and compatibility

`public/lib/catalog-identifiers.js` applies the eight known corrections by stable variant ID in the browser, the server catalog, and content-store normalization. This covers older local-storage copies and the private Blob-backed Dragon Punch record without replacing admin content or depending on incorrect/non-unique legacy SKUs. Corrected values are also stored in the built-in catalog JSON.

Do not rename a variant ID when correcting its supplier item number: existing IDs intentionally retain some old numeric suffixes because they are used by carts, links, order history, custom pricing, and image lookups. They are opaque identifiers, not the displayed supplier item number.

Order preview, new submissions, and newly composed PDFs use the server-reconciled identifiers. Existing persisted order snapshots are not rewritten. PDF thumbnail lookup keys have been regenerated against the new item numbers; image bytes and stable variant keys are unchanged.

Client asset/data URLs have been versioned to fetch the corrected data after deployment. Private APIs remain network-only.

## Future master-list updates

1. Match by product and flavor, verifying UPC where available; never match only a potentially incorrect item number.
2. Update the built-in catalog identifiers and stable-ID corrections for changed or admin-managed variants.
3. Update the source fixture with the workbook row references. Retain explicit notes for missing products.
4. Run `npm run generate:pdf-thumbnails`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
5. Verify order preview returns server values even when the request supplies stale numbers.

## Verification performed

- 71 unit/regression tests; TypeScript, lint, legacy JS syntax, production build, and diff checks passed.
- Production-build local API test: all 56 master rows returned correct item numbers and UPCs from order preview despite deliberately wrong client identifiers and prices.
- The content API returned corrected Dragon Punch UPC from an isolated fixture carrying its old blank UPC.
- The PDF API successfully generated a document for the 55 built-in master variants. No live orders, messages, or production writes were made.
- Compared catalog before/after excluding only item and UPC: all other data was identical. Regenerated PDF image bytes were identical; only SKU lookup mappings changed.
