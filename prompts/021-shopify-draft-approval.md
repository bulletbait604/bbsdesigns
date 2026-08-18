# Cursor Prompt 021 — Shopify Draft From Approval

Connect human approval to Shopify GraphQL draft creation.

## Requirements

- From Safety Queue / Publishing: approved + safety PASS items can create a Shopify DRAFT only.
- Never create ACTIVE products while AUTO_PUBLISH=false.
- Use existing createShopifyProductDraft + publishing queue processPublishingItem.
- Absolute media URLs required (APP_URL or R2 public URL).
- Optional Printify product sync when PRINTIFY_* is configured; otherwise record shopify-only draft.
- Publishing dashboard lists live queue items.
- Keep HUMAN_APPROVAL=true default.

## Verify

typecheck, lint, tests, build.
