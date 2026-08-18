# 16 — Live dashboard polish

Honest empty states when Mongo is configured:

- Ideas / Designs / Safety / Overview return empty live data instead of demo catalogs.
- Analytics returns empty live weekly reports when there are no products/orders (demo only without Mongo, or `?seed=1`).
- Stores / Brands / Audit pages read Mongo models.
- Providers page includes live `healthCheckAll()` results.
- Printify webhooks update Order status / printifyOrderId when possible.
- Safety approve/draft actions require real Mongo ObjectIds.
