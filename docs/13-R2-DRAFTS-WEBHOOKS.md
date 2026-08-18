# 13 — R2, Shopify drafts & webhooks (020–022)

## R2 storage (020)

Set on Vercel:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` (public bucket URL / custom domain)

When present, design engine uploads image bytes to R2 for durable public URLs.

## Shopify draft from approval (021)

1. Safety Queue → **Approve** (human)
2. **Create Shopify draft** — GraphQL DRAFT only (never ACTIVE while `AUTO_PUBLISH=false`)
3. `/dashboard/publishing` lists queue + can retry draft creation
4. Printify product sync runs only when blueprint/provider ids are set; otherwise shopify-only

Media URLs are absolutized with `APP_URL` (or R2 public URLs).

## Webhooks (022)

| Endpoint | Secret |
|---|---|
| `POST /api/webhooks/shopify` | `SHOPIFY_WEBHOOK_SECRET` (HMAC-SHA256 header) |
| `POST /api/webhooks/printify` | `PRINTIFY_WEBHOOK_SECRET` (Bearer or `X-Printify-Secret`) |

Invalid signatures → 401. Verified Shopify `orders/*` topics upsert an Order mirror when Mongo is configured.
