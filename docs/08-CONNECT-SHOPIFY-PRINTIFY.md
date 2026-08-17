# 08 — Connect Shopify & Printify

Secrets go in **Vercel → Project → Settings → Environment Variables** and local `.env.local`.
Never commit tokens.

## Shopify

1. Shopify Admin → **Settings → Apps and sales channels → Develop apps**.
2. Allow custom app development if prompted.
3. **Create an app** named e.g. `AI Merch Factory`.
4. Configure **Admin API** scopes (minimum to start):
   - `write_products`, `read_products`
   - `write_publications`, `read_publications`
   - `read_orders`
   - `write_files` (for media uploads later)
5. **Install** the app and copy the **Admin API access token**.
6. Set Vercel / `.env.local`:
   - `SHOPIFY_STORE_DOMAIN=your-store.myshopify.com`
   - `SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...`
   - `SHOPIFY_API_VERSION=2026-07` (or current stable)
7. Redeploy Vercel.
8. Confirm on `/dashboard/providers` that Shopify shows **Configured**.

Products are created as **DRAFT** while `HUMAN_APPROVAL=true` and `AUTO_PUBLISH=false`.

## Printify

1. Create / open your Printify account.
2. Connect your **Shopify store** inside Printify’s channels UI.
3. Generate an **API token** (Printify account API / connections).
4. Set:
   - `PRINTIFY_API_TOKEN=...`
5. Redeploy and check `/dashboard/providers`.

Shop / blueprint / print-provider IDs will be stored in Settings once the Printify adapter is implemented. Until then the token is enough to mark the integration as configured.

## Also required for a real pipeline

- `MONGODB_URI` — Atlas connection string
- `APP_URL` — your Vercel URL
- Later: `AI_TEXT_API_KEY`, `IMAGE_API_KEY` (and optional R2 keys)

## Safety defaults (do not flip yet)

```
HUMAN_APPROVAL=true
AUTO_PUBLISH=false
```
