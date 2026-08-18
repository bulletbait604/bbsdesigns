# 19 — Viral Flash trend algorithm

## Goal

Keep every generated design **flashy, viral, gift-ready** by scoring themes for marketplace demand + holiday windows + inseparable art+text fit, then feeding those themes into slogans and flash merch formulas.

## Version

`VIRAL_ALGORITHM_VERSION = viral-v2-social-etsy-2026-08-fresh`  
Design prompts: `design-prompt-v9-viral-max`  
Slogan prompts: `slogan-engine-v5-viral-social`

Niches researched: gaming, baseball, softball, **pets, teacher, nurse, humor, retro, bookish**.

Cross-niche viral marketplace queries (TikTok/Etsy/Shopping language via SerpAPI) run every trend pass.

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
- Idea, Product, ProductVariant
- SafetyReview, PublishingJob, ProductLifecycleDecision
- In-memory publishing queue

Manual: `POST /api/automation` with `{ "action": "purge_viral_state" }` (admin session).
Then run **Trend research → Idea generation → Design generation**.

## Pipeline wiring

1. Trend research → Viral Flash score  
2. Idea generation → Identity × Occasion slogans  
3. Design generation → flash formulas + occasion vibe in prompt  
