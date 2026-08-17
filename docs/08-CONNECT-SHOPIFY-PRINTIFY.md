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

Printify needs **two** setup pieces:
1. Link your Shopify store inside Printify (fulfillment channel)
2. Create an API token for *this* app (`PRINTIFY_API_TOKEN`)

### Part A — Connect your Shopify store to Printify (detailed)

Do this while logged into the **same email mindset** you use for Shopify (one Shopify store ↔ one Printify account).

**Easiest path (start in Shopify):**

1. Open your Shopify admin: `https://YOUR-STORE.myshopify.com/admin`
2. In the left sidebar click **Apps**
3. Click **Shopify App Store** (or **Explore apps** / **Visit Shopify App Store**)
4. Search for **Printify**
5. Open the official app: **Printify: Print on Demand** (developer should be Printify / Printify, Inc. — green logo)
6. Click **Install** / **Add app**
7. Review permissions (products, orders, fulfillment) → click **Install app**
8. When prompted, **log in to your existing Printify account** (or create one)
9. Confirm the store connection finishes — you should land in Printify with that Shopify store attached

**Alternate path (start in Printify):**

1. Go to [https://printify.com](https://printify.com) and sign in
2. Click the **store dropdown** in the upper-left (store name / “My store”)
3. Choose **Manage my stores** (sometimes labeled **My stores**)
4. Click **Connect** or **Add a new store**
5. Choose **Shopify**
6. Enter your store URL as `YOUR-STORE.myshopify.com` (prefer the `.myshopify.com` URL, not a custom domain)
7. Click through **Get the app** / install prompts
8. In the Shopify tab that opens, click **Install**
9. Log in to Printify if asked, then return to Printify and click **Continue** if shown

**How you know Part A worked:**
- In Printify → Manage my stores, your Shopify store is listed as connected
- In Shopify Admin → Apps, **Printify** appears as installed
- Official help: [How can I connect my Shopify store?](https://help.printify.com/hc/en-us/articles/4483630095505-How-can-I-connect-my-Shopify-store)

**If install fails:**
- Make sure you’re not already connected under a *different* Printify login
- Use the same browser session / avoid blocked pop-ups during Install
- Uninstall the Printify app in Shopify, wait a minute, then install again
- Prefer `your-store.myshopify.com` over a custom domain during connect

### Part B — Create a Printify API token for bbsdesigns

1. In Printify, open **My Profile / Account** → **Connections**  
   Direct link: [https://printify.com/app/account/api](https://printify.com/app/account/api)
2. Add a **contact email** if prompted (for API notices)
3. Click **Generate** / **Generate token**
4. Name it e.g. `bbsdesigns-merch-factory`
5. Enable scopes you’ll need for products/shops/orders (read + write for shops & products is typical to start)
6. Generate the token and **copy it immediately** — Printify only shows it once
7. Tokens expire after about **1 year**; store it only in env vars

### Part C — Put the token in our system

Local `.env.local`:
```
PRINTIFY_API_TOKEN=paste_token_here
```

Vercel → Project → Settings → Environment Variables:
- Key: `PRINTIFY_API_TOKEN`
- Value: the token
- Environments: Production + Preview
- Save → **Redeploy**

Then open `/dashboard/providers` and confirm Printify shows **Configured**.

Shop / blueprint / print-provider IDs will be stored in Settings once the Printify adapter is implemented. Until then the token is enough to mark the integration as configured.

Official API token help: [How can I generate an API token?](https://help.printify.com/hc/en-us/articles/4483626447249-How-can-I-generate-an-API-token)  
Developer docs: [https://developers.printify.com/](https://developers.printify.com/)


## Also required for a real pipeline

- `MONGODB_URI` — Atlas connection string
- `APP_URL` — your Vercel URL
- Later: `AI_TEXT_API_KEY`, `IMAGE_API_KEY` (and optional R2 keys)

## Safety defaults (do not flip yet)

```
HUMAN_APPROVAL=true
AUTO_PUBLISH=false
```
