## AI Merch Factory (bbsdesigns)

Shopify-first AI print-on-demand automation for original funny gaming, baseball, and softball merchandise.

### Defaults
- `HUMAN_APPROVAL=true`
- `AUTO_PUBLISH=false`

### Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### Connect Shopify & Printify
See `docs/08-CONNECT-SHOPIFY-PRINTIFY.md` and `/dashboard/providers`.

Set secrets in **Vercel → Settings → Environment Variables**, then redeploy:
- `APP_URL`
- `MONGODB_URI`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `PRINTIFY_API_TOKEN`

### Docs
Start with `docs/01-START-HERE.md`, then follow `docs/03-BUILD-ORDER.md` and `prompts/` in order.

### Safety
Never publish products that fail safety review. Trend score cannot override a safety rejection.
