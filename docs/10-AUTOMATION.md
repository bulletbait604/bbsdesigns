# 10 — Automation

Jobs (unique ID, idempotent, logged, retryable, observable):

- trend_ingestion, trend_scoring, idea_generation, safety_review
- design_generation, image_review, mockups, listing_preparation
- publishing (**skipped** while `HUMAN_APPROVAL=true` and `AUTO_PUBLISH=false`)
- analytics_sync, retirement_candidates, weekly_report

Dashboard controls on `/dashboard/automation`:
- Run now / Pause / Resume / Retry / View logs

**Scheduled runner:** Vercel Cron in `vercel.json` → `GET /api/cron/automation` daily at 14:00 UTC.  
Protect with `CRON_SECRET` (`Authorization: Bearer $CRON_SECRET`).

Produces both **AI text slogans** and **AI illustrated images** when Gemini keys are set.  
See `docs/17-AUTONOMY-AND-DAILY-COSTS.md` for readiness + cost estimates.

Retirement candidates are advisory only — **no automatic deletes**.
