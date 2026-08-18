# Cursor Prompt 027 — Shopify / Order Analytics Sync

Feed KEEP / OPTIMIZE / RETIRE reports from real stored metrics.

## Requirements

- Sync metrics from Mongo Products + Orders (webhook-mirrored) into SalesMetric + analytics engine.
- Optionally enrich from Shopify Admin GraphQL orders when credentials exist.
- Wire automation `analytics_sync` to this sync (demo seed only as empty fallback).
- Analytics dashboard prefers live report over forced demo seed.

## Verify

typecheck, lint, tests, build.
