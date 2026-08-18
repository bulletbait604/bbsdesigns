# 11 — Trend sources & graphic designs

## Env vars

| Key | Purpose |
|---|---|
| `SERPAPI_API_KEY` | Google Trends + Google Shopping demand research |
| `ETSY_API_KEY` | Etsy app keystring |
| `ETSY_SHARED_SECRET` | Etsy shared secret (`x-api-key: key:secret`) |
| `IMAGE_PROVIDER` / `IMAGE_API_KEY` | Later: real graphic AI (not wired to a live vendor yet) |

## Behavior

- Themes / keywords / demand signals only — **never copy** third-party artwork or trademarks.
- Scores estimate opportunity only — **not a sales guarantee**.
- Reddit OAuth is optional/blocked for new apps (Responsible Builder Policy); SerpAPI + Etsy are primary.

## Dashboard

- `/dashboard/trends` — live SerpAPI/Etsy + curated seeds
- `GET /api/trends` — admin session required
- Automation **trend_ingestion** / **trend_scoring** runs `runTrendEngine`

## Design prompts

`buildDesignPrompt` requires a **dominant illustration**, not typography-only layouts.
