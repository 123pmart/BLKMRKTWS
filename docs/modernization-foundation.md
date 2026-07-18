# Modernization foundation

## React customer portal (2026-07-18)

The public ordering experience is now App Router owned. `/`, `/products`, `/products/[slug]`, `/cart`, `/news`, `/catalog`, `/sign-in`, `/account`, `/account/orders`, and `/account/orders/[id]` render route-specific React trees and do not return `public/index.html` or load `public/app.js`.

`/admin` is the one deliberate compatibility boundary. Its route handler still returns the legacy document and loads `public/app.js` plus `public/styles-v3.css`. Those legacy assets remain because the product/news/order administration workflow has not yet reached React parity; customer routes do not construct that markup or download those files.

The normalized public catalog contract is created by `app/lib/catalog/server-catalog.ts`. It combines built-in catalog data, persisted custom products, visibility/status overrides, gallery data, optimized WebP card images, and verified account price overrides. The browser displays this contract, while order preview, submission, email, history, and PDF paths continue to resolve and reprice submitted variant IDs against the server catalog.

Interactive customer state is isolated in focused client boundaries:

- `CartProvider` and the pure cart reducer own device persistence and quantity transitions.
- `CatalogExplorer`, `ProductCard`, `QuantityControl`, and `QuickOrder` own catalog interaction without nested controls.
- `CheckoutCart` owns the two-step checkout while profile ownership and pricing remain server verified.
- `ReorderButton` loads an authorized current-catalog review before merge or replacement.
- The fixed mobile navigation is shared by React routes and is omitted from `/admin`.

The next legacy migration target is admin. Build a typed admin data adapter and migrate one admin section at a time (accounts first, then orders/news/products) before deleting `public/index.html`, `public/app.js`, or `public/styles-v3.css`.

## Historical baseline (before this migration)

- `public/index.html`, `public/app.js`, and `public/styles-v3.css` owned catalog, cart, checkout, news, catalog viewer, install prompt, modals, and admin.
- App Router handlers returned that entire document for every public route, producing roughly 991 DOM nodes before route-specific content.
- React + strict TypeScript initially owned only sign-in and account surfaces.

## Current data and security boundaries

- Public catalog data is normalized on the server before React receives it. Account price overrides are applied only after the session resolves to an active account.
- Cart state uses a typed reducer and a device-local persistence adapter. A server-draft adapter is intentionally deferred, so cross-device cart persistence is not claimed.
- Self-registration creates a pending account and no session. Pending and disabled records cannot access protected prices, profiles, or orders; admin approval is explicit.
- Profile and order ownership come only from the verified HttpOnly session. Profile mutations accept only validated contact/shipping fields and retain the server-owned store ID and salesperson.
- Reorder reads an order already scoped to the verified store, resolves stable variant IDs against the current catalog, and presents merge/replace review without submitting.
- Preview, order submission, history, email, and PDF generation continue to resolve and reprice lines on the server.
- Vercel Blob is the durable production account/content/order/push store. Local filesystem stores exist only when explicit development paths are configured; production fails closed without durable storage.
- Login throttling remains process-local behind the existing interface. Production should replace it with a distributed limiter when a configured shared service is available.
- Blob-backed aggregate order storage is durable but does not claim transactional database semantics.

## Remaining legacy boundary

Only `/admin` still owns the legacy document. The next safe migration is a typed React accounts section backed by the existing admin API, followed by orders, news, and products. Keep the legacy implementation until each admin section reaches parity.

## Measured asset baseline

- `public/` contains 277 files and is about 107 MB; the catalog PDF is about 10.9 MB.
- The largest raster product files are roughly 1.0–1.1 MB each, generally 1000–1200 px square.
- The previous immediate preload set referenced 14 unique files totaling 4,916,246 bytes. The reduced set references 7 unique files totaling 3,035,258 bytes.
- The previous idle nutrition-panel preload referenced 21 unique files totaling 4,471,238 bytes. The new idle preload references one first-visible panel totaling 193,089 bytes.

These are repository payload measurements, not claims about end-user load time. A deployed Lighthouse/WebPageTest run is still needed for LCP, CLS, INP, long tasks, and cache-hit timing.

## Local production comparison (2026-07-18)

- Legacy baseline: roughly 991 DOM nodes from the document-wide shell.
- React signed-out home: 104 DOM nodes and six category cards.
- React products: 404 DOM nodes with 18 of 56 cards rendered initially; additional cards render on demand.
- React news: 92 DOM nodes.
- React catalog: 109 DOM nodes; 10 of 11 preview images are lazy and the PDF is not embedded or preloaded.
- Customer routes do not include `public/app.js`, `public/styles-v3.css`, hidden admin markup, or catalog PDF embeds.
- The product route's nine initial local script files total 650,155 raw bytes: 80,935 bytes are route/shared portal component chunks and 569,220 bytes are Next/React runtime, bootstrap, and polyfill chunks. This is a raw local-build observation, not transferred or parsed byte cost.
- React customer CSS is 46,905 raw bytes versus 81,481 raw bytes for the admin-only legacy stylesheet.
- `public/app.js` remains 170,841 raw bytes but is downloaded only by `/admin`.
