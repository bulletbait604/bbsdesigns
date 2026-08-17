## AI Merch Factory (bbsdesigns)

Shopify-first AI print-on-demand automation for original funny gaming, baseball, and softball merchandise.

### Status
Foundation phase (prompt 002). Business logic comes in later prompts.

### Defaults
- `HUMAN_APPROVAL=true`
- `AUTO_PUBLISH=false`

### Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

### Docs
Start with `docs/01-START-HERE.md`, then follow `docs/03-BUILD-ORDER.md` and `prompts/` in order.

### Safety
Never publish products that fail safety review. Trend score cannot override a safety rejection.
