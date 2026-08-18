# 12 — Live pipeline (prompt 019)

After prompts 001–018, the factory loop is wired end-to-end (still gated).

## Run order (Automation dashboard)

1. Trend ingestion / scoring — scores + Mongo persist when `MONGODB_URI` is set  
2. Idea generation — slogans → Ideas collection  
3. Safety review — PASS / REVIEW / REJECT on Ideas  
4. Design generation — cache-first; up to `MAX_AI_DESIGNS_PER_RUN` (default **5**) paid AI illustrations per run; SVG placeholder fallback otherwise; upgrades prior SVG rows when AI is available  
5. Image review → Mockups → Listing preparation  
6. Publishing — **skipped** while `HUMAN_APPROVAL=true` and `AUTO_PUBLISH=false`

## Dashboards

- `/dashboard/ideas` — Mongo ideas (demo fallback if empty)  
- `/dashboard/safety` — Approve / Reject (Publish stays locked)

## Cost control

- Design/trend Mongo caches (see `docs/11-TREND-SOURCES-AND-IMAGES.md`)  
- Automation caps paid Gemini generations at **1 per design_generation run**
