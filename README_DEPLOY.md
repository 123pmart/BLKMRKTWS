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

The order email API route supports these Vercel environment variables:

```text
RESEND_API_KEY
ORDER_FROM_EMAIL
ORDER_TO_EMAIL
```

`RESEND_API_KEY` is required only if you want `/api/send-order` to send email through Resend. `ORDER_FROM_EMAIL` defaults to `BLACKMARKET Wholesale <orders@blackmarketlabs.com>`, and `ORDER_TO_EMAIL` defaults to `pmart@blackmarketlabs.com`.

## Notes

- The homepage is served by `app/route.js`, which returns the portal HTML from `public/index.html`.
- The static portal assets, product data, catalog pages, PDFs, images, and scripts used by the browser live under `public/`.
- Do not commit `node_modules`, `.next`, `.vercel`, or local `.env` files.
