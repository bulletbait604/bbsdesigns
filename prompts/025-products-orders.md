# Cursor Prompt 025 — Live Products & Orders

Replace Products and Orders dashboard placeholders with Mongo-backed lists.

## Requirements

- Products: show Product docs; upsert Product when a Shopify draft is created from approval.
- Orders: show Order docs mirrored from verified Shopify webhooks.
- Empty states explain how to populate (approve → draft; configure webhooks).
- Keep AUTO_PUBLISH=false.

## Verify

typecheck, lint, tests, build.
