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
ADMIN_PASS
ORDER_STORE_FILE
RESEND_API_KEY
ORDER_FROM_EMAIL
ORDER_TO_EMAIL
```

`/api/send-order` always saves valid orders to the portal inbox first. `RESEND_API_KEY` is required only if you also want order emails through Resend. `ADMIN_PASS` defaults to the current admin password, and `ORDER_STORE_FILE` can point the server inbox at a writable JSON file path when your host provides one.

## Notes

- The homepage is served by `app/route.js`, which returns the portal HTML from `public/index.html`.
- The static portal assets, product data, catalog pages, PDFs, images, and scripts used by the browser live under `public/`.
- Do not commit `node_modules`, `.next`, `.vercel`, or local `.env` files.
