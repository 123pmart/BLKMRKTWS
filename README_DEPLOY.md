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
BLOB_READ_WRITE_TOKEN
ORDER_STORE_FILE
RESEND_API_KEY
ORDER_FROM_EMAIL
ORDER_TO_EMAIL
```

`/api/send-order` always saves valid orders to the portal inbox first. On Vercel, create a Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is injected; that is the durable production inbox. `ORDER_STORE_FILE` is only a local/self-hosted fallback.

`RESEND_API_KEY` is optional. If it is missing, orders still save to the admin inbox and email sending is skipped silently. When Resend is configured later, `ORDER_FROM_EMAIL` defaults to `pmart@blackmarketlabs.com`, `ORDER_TO_EMAIL` defaults to `pmart@blackmarketlabs.com`, and each order sends an admin copy plus a customer confirmation to the store email entered at checkout.

## Notes

- The homepage is served by `app/route.js`, which returns the portal HTML from `public/index.html`.
- The static portal assets, product data, catalog pages, PDFs, images, and scripts used by the browser live under `public/`.
- Do not commit `node_modules`, `.next`, `.vercel`, or local `.env` files.
