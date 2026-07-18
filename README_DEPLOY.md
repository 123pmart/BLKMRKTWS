# BLACKMARKET Wholesale Deploy

This is the clean deployment repo for the BLACKMARKET Wholesale portal.

## Vercel Settings

```text
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: leave blank
Install Command: npm install
```

## Local Check

```bash
npm install
npm run build
npm run dev
```

Then open `http://localhost:4173`.

## Environment Variables

The portal supports these production and local-verification environment variables:

```text
ADMIN_PASS
ADMIN_MATT_PASS
ADMIN_BEAU_PASS
ADMIN_SESSION_SECRET
BLOB_READ_WRITE_TOKEN
CONTENT_STORE_FILE
ACCOUNT_STORE_DIR
PUSH_STORE_DIR
ORDER_STORE_FILE
RESEND_API_KEY
ORDER_FROM_EMAIL
ORDER_TO_EMAIL
WEB_PUSH_CONTACT
WEB_PUSH_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
```

`/api/send-order` always saves valid orders to the portal inbox first. On Vercel, create a Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is injected; that is the durable production inbox. `ORDER_STORE_FILE` is only a local/self-hosted fallback.

`RESEND_API_KEY` is optional. If it is missing, orders still save to the admin inbox and email sending is skipped silently. When Resend is configured later, `ORDER_FROM_EMAIL` defaults to `pmart@blackmarketlabs.com`, `ORDER_TO_EMAIL` defaults to `pmart@blackmarketlabs.com`, and each order sends an admin copy plus a customer confirmation to the store email entered at checkout.

`ACCOUNT_STORE_DIR`, `CONTENT_STORE_FILE`, `ORDER_STORE_FILE`, and `PUSH_STORE_DIR` are explicit local/self-hosted verification overrides. Do not configure them on Vercel; production should use `BLOB_READ_WRITE_TOKEN`. Web push requires all three `WEB_PUSH_*` values. `ADMIN_SESSION_SECRET` should be a long independent production secret.

## Notes

- Customer pages are route-specific App Router React pages: `/`, `/products`, `/products/[slug]`, `/cart`, `/news`, `/catalog`, `/sign-in`, `/account`, `/account/orders`, and `/account/orders/[id]`.
- `/admin` is the only legacy compatibility route and continues to return `public/index.html` through `app/admin/route.ts` until the admin sections reach React parity.
- Do not remove `public/app.js` or `public/styles-v3.css`; they are now admin-only assets.
- The static portal assets, product data, catalog pages, PDFs, images, and scripts used by the browser live under `public/`.
- Do not commit `node_modules`, `.next`, `.vercel`, or local `.env` files.
