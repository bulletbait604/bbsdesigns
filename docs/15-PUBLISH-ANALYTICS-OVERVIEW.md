# 15 — Publishing hydrate, analytics sync, live overview (026–028)

## Publishing hydrate (026)

- `hydratePublishingQueueFromMongo()` loads `PublishingJob` docs into the in-memory queue.
- Publishing API GET and draft/process paths call hydrate before list/get.
- Persist-on-write remains; works without Mongo (memory-only).

## Analytics sync (027)

- `syncAnalyticsMetrics()` builds weekly metrics from Mongo Products + Orders.
- Optional Shopify Admin GraphQL orders when store credentials exist.
- Upserts `SalesMetric` for real Product ObjectIds; in-memory engine always updated.
- Automation `analytics_sync` / `weekly_report` / `retirement_candidates` use this sync.
- Demo seed only when Mongo is empty or not configured.

## Live overview (028)

- Overview page loads awaiting approval, Shopify drafts, safety rejects, trend avg from live data.
- Approval queue + top trends from safety/trend loaders.
- Setup hints shown when Mongo is empty / demo.
