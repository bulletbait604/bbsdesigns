# 19 — Viral Flash trend algorithm

## Goal

Keep every generated design **flashy, viral, gift-ready** by scoring themes for marketplace demand + holiday windows + inseparable art+text fit, then feeding those themes into slogans and flash merch formulas.

## Version

`VIRAL_ALGORITHM_VERSION = viral-v1-flash-2026-08-r1`  
Design prompts: `design-prompt-v8-viral-flash`  
Slogan prompts: `slogan-engine-v4-viral-flash`

## Inputs (APIs only)

| Source | Use |
|---|---|
| SerpAPI Google Shopping | Multi-query viral + occasion packs per niche |
| SerpAPI Google Trends | Related/rising queries |
| Etsy Open API | Active listings by viral keyword packs |
| Curated viral seeds | Offline fallback with holiday/flash hints |

No HTML scraping of Etsy/Shopify storefronts (ToS).

## Scoring extras

- `scoreFlashDesignFit` — humor/graphic/retro/neon language
- `scoreIdentitySpecificity` — mom/dad/beer league/gamer roles
- `holidayBoostForText` / `getActiveHolidayWindows` — calendar with lead weeks
- `viralSearchQueries` — niche base + active occasion queries

## Reset / purge

On algorithm or design-prompt version bump, `ensureViralAlgorithmMigration()` deletes:

- Design, CachedDesign
- TrendSignal, TrendScore, CachedTrendBatch
- Idea, Product (pipeline creative slate)

Manual: `POST /api/automation` with `{ "action": "purge_viral_state" }` (admin session).

## Pipeline wiring

1. Trend research → Viral Flash score  
2. Idea generation → Identity × Occasion slogans  
3. Design generation → flash formulas + occasion vibe in prompt  
