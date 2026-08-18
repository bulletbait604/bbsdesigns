# Cursor Prompt 022 — Webhooks

Add verified webhook endpoints before trusting live order events.

## Requirements

- `POST /api/webhooks/shopify` — verify HMAC-SHA256 with `SHOPIFY_WEBHOOK_SECRET`.
- `POST /api/webhooks/printify` — verify shared secret header with `PRINTIFY_WEBHOOK_SECRET` when set.
- Reject invalid signatures with 401.
- Log verified events; upsert basic Order mirror when possible.
- Update security / launch checks to PASS when secrets + routes exist.
- Do not enable AUTO_PUBLISH.

## Verify

typecheck, lint, tests, build.
