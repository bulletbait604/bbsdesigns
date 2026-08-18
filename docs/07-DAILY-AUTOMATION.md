# 07 — Daily Automation

**Live schedule:** Vercel Cron runs `GET /api/cron/automation` daily at 14:00 UTC (see `vercel.json`).  
Readiness + cost estimate: `docs/17-AUTONOMY-AND-DAILY-COSTS.md`.

Suggested first schedule:

Morning (automated):
1. Collect trend signals.
2. Normalize and deduplicate.
3. Score trends.
4. Select top opportunities.
5. Generate slogan candidates (**AI text**).
6. Safety-review slogans.
7. Generate designs (**AI illustrations**, SVG only as fallback).
8. Review designs.
9. Prepare mockups/listings.
10. Put products in approval queue.

Evening (automated):
1. Sync analytics.
2. Identify best sellers.
3. Identify weak products.
4. Create retirement candidates.
5. Generate an AI report.

Human (required under default gates):
- Approve safety / publishing queue items and create Shopify drafts.

Do not automatically delete poor performers initially.
Mark them RETIRE_CANDIDATE and review them.
