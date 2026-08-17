# 06 — Shopify Publishing

Default:
Products are created as DRAFT.

A product cannot publish unless:
- safety = PASS
- design quality passes
- listing validation passes
- price is valid
- required media exists
- required variants exist

Use idempotency so retries cannot create duplicate products.

Keep an audit trail for every publishing action.

Use Shopify's current GraphQL Admin API rather than legacy REST product creation.
