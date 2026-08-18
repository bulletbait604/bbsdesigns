# 14 — AI slogans, durable automation, products/orders (023–025)

## AI slogans (023)

With `GEMINI_API` / `AI_TEXT_API_KEY` set, idea generation uses Gemini text (`gemini-2.5-flash` by default). Templates remain the offline fallback.

## Durable automation (024)

Automation runs upsert into Mongo (`AutomationRun`) when `MONGODB_URI` is set. Cron + dashboard hydrate from Mongo so serverless cold starts keep history and idempotency.

## Products & orders (025)

- `/dashboard/products` — Product docs created when a Shopify draft succeeds from approval  
- `/dashboard/orders` — Order docs from verified Shopify webhooks  

Empty states explain the next operator action.
