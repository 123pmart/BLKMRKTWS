# Modernization foundation

## Current production shape

- `public/index.html`, `public/app.js`, and `public/styles-v3.css` still own the catalog, cart, orders, PDF generation, admin console, news editor, catalog viewer, install prompt, and image galleries.
- App Router route handlers serve that legacy document at `/`, `/products`, `/products/[slug]`, `/news`, `/catalog`, `/cart`, and `/admin`. This is the compatibility boundary; legacy behavior has not been duplicated in React.
- React + strict TypeScript owns `/sign-in`, `/account`, `/account/orders`, `/account/orders/[id]`, `/assistant`, and `/admin/assistant`, plus the shared layout, mobile account navigation, and shadcn/ui primitives.
- `/assistant` uses the live server catalog and a deterministic local knowledge engine without loading `public/app.js`. Customer access is default-off behind the durable `assistantEnabled` release flag; authenticated admins can privately test it from the isolated `/admin/assistant` configuration surface.
- Content and orders are normalized and written by Node route handlers. Vercel Blob is the intended durable production store; filesystem storage is a local-development fallback only.

## Data and security boundaries

- Catalog data loads from `public/catalog-data.json` and is merged with admin content from `/api/content` plus legacy local-storage state.
- Cart and buyer form state remain device-local. Order submission goes to `/api/send-order`; admin order access remains on `/api/orders` behind the existing admin header.
- Store accounts are intentionally closed: no provider or durable `storeId` exists. `/api/account/orders` returns `401` until `getVerifiedStoreIdentity()` can return a server-verified identity. URL parameters, local storage, request bodies, and buyer-entered email values are never treated as ownership.
- Before enabling customer accounts, add an authentication provider, a durable Store table, server-assigned `storeId` on every order, and indexed server queries that always scope by the verified identity.

## Next catalog migration boundary

The next safe React-owned surface is a catalog grid mounted behind an explicit adapter for `getQty`, `setQty`, `openProductModal`, and cart persistence. Only after that boundary has parity should a React `ProductCard` replace the legacy string renderer. The legacy renderer must remain until quantity, modal, coming-soon, limited-edition, MAP, running-low, and cart behavior pass the same browser flows.

## Measured asset baseline

- `public/` contains 277 files and is about 107 MB; the catalog PDF is about 10.9 MB.
- The largest raster product files are roughly 1.0–1.1 MB each, generally 1000–1200 px square.
- The previous immediate preload set referenced 14 unique files totaling 4,916,246 bytes. The reduced set references 7 unique files totaling 3,035,258 bytes.
- The previous idle nutrition-panel preload referenced 21 unique files totaling 4,471,238 bytes. The new idle preload references one first-visible panel totaling 193,089 bytes.

These are repository payload measurements, not claims about end-user load time. A deployed Lighthouse/WebPageTest run is still needed for LCP, CLS, INP, long tasks, and cache-hit timing.
