# Performance audit — 2026-07-17

## Scope and method

The production Next.js build was exercised locally in the in-app Chromium browser at 390×844, 768×1024, and 1440×900. Responsive overflow was also checked at 320, 375, 390, 414, 430, and 768 pixels. The route matrix covered `/`, `/products`, `/news`, `/catalog`, `/cart`, `/products/[slug]`, `/sign-in`, `/account`, and `/admin`.

Route-ready measurements below are warm-local navigation wall times. They are useful for regression checks, not substitutes for production Core Web Vitals on real iOS and Android hardware. Static payload measurements come from the exact production repository assets.

## Findings before this change

- The 56 built-in variant bottle PNGs used by product cards totaled 23.01 MB. The 24 thermogenic variants alone totaled 9.57 MB; the first four eager thermogenic card images totaled 1.03 MB.
- The compatibility shell creates about 991 DOM nodes and 55 image elements on every legacy route, including Home, News, and Catalog. Lazy loading limits downloads, but hidden views still carry parsing and DOM cost.
- `public/app.js` is 158,136 bytes (36,157 bytes gzip), `public/styles-v3.css` is 76,574 bytes (13,646 bytes gzip), and `public/catalog-data.json` is 69,665 bytes (9,178 bytes gzip).
- The checked-in catalog PDF is 11 MB. It is intentionally isolated to the Catalog experience, but remains the largest single public asset.
- The full `public` directory is 109 MB on disk. This is not an initial-page transfer measurement.
- Warm local route navigation was 24–41 ms across the tested responsive profiles. No horizontal overflow occurred in the measured matrix.

## Implemented optimization

- Every built-in variant now has a 640px WebP `cardImage` for list, category, and product-card rendering. Original bottle files remain the source for product details, galleries, orders, and admin editing.
- Generated names include a content fingerprint, allowing the existing one-year immutable `/assets/` cache policy to remain correct after future image changes.
- The card-image set is 1.56 MB, a 93.2% reduction from the 23.01 MB original set.
- Thermogenic card media is 0.67 MB, a 93.0% reduction from 9.57 MB.
- The first four eager thermogenic cards are 0.10 MB, a 90.5% reduction from 1.03 MB.
- Existing lazy loading, async decoding, and critical-image priority behavior are preserved.

## Post-change browser verification

- Warm local route navigation remained in the same 24–41 ms band; no unsupported speed multiplier is claimed.
- The browser selected the new `/assets/catalog-cards/*.webp` resources on product/category surfaces.
- Home still contains exactly six entry cards and the mobile Home control returns to `/`.
- No horizontal overflow was detected at 320, 375, 390, 414, 430, 768, or 1440 pixels.
- Mobile navigation was visible at 320–430 pixels, hidden at 768 pixels, and hidden for Admin. Product and cart overlays continue to set the footer navigation inaccessible while open.
- Direct loads worked for all audited routes. Signed-out `/account` correctly redirected server-side to `/sign-in`.

## Remaining bottlenecks and next measurements

1. Move legacy routes into separate React-owned rendering boundaries so Home, News, and Catalog do not construct the entire 990-node portal shell.
2. Capture field Core Web Vitals from Vercel Analytics or another RUM source, then run Lighthouse/WebPageTest against the deployed domain on simulated mobile networks. Local warm timings cannot measure production LCP, INP, or CDN latency.
3. Convert only the detail/gallery images that field data identifies as significant; they are lazy and should not be bulk-converted without route-level evidence.
4. Consider a lighter catalog preview or page-image stream if the 11 MB PDF becomes a measured Catalog-route bottleneck.
5. Keep heavy PDF/admin dependencies server-only or route-split. The current PDF generator remains server-only and the two-page, 14-line verification document was 65 KB.

## Browser coverage limitation

This pass verified Chromium responsive profiles, not physical iPhone Safari, Android Chrome, Firefox, or Edge devices. The safe-area CSS and width matrix passed, but final device testing remains necessary before claiming cross-browser field parity.
