# 10 — Automation

Jobs (unique ID, idempotent, logged, retryable, observable):

- trend_ingestion, trend_scoring, idea_generation, safety_review
- design_generation, image_review, mockups, listing_preparation
- publishing (**skipped** while `HUMAN_APPROVAL=true` and `AUTO_PUBLISH=false`)
- analytics_sync, retirement_candidates, weekly_report

Dashboard controls on `/dashboard/automation`:
- Run now / Pause / Resume / Retry / View logs

Cron entrypoint: `GET /api/cron/automation`  
Optional header: `Authorization: Bearer $CRON_SECRET`

Retirement candidates are advisory only — **no automatic deletes**.
