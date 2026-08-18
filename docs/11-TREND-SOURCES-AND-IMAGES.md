# 11 — Trend sources & graphic designs

## Env vars

| Key | Purpose |
|---|---|
| `SERPAPI_API_KEY` | Google Trends + Google Shopping demand research |
| `ETSY_API_KEY` | Etsy app keystring |
| `ETSY_SHARED_SECRET` | Etsy shared secret (`x-api-key: key:secret`) |
| `IMAGE_PROVIDER` / `IMAGE_API_KEY` / `GEMINI_API` | Google Gemini image generation |
| `MONGODB_URI` | Persist design images + trend batches (cuts repeat API spend) |

## Behavior

- Themes / keywords / demand signals only — **never copy** third-party artwork or trademarks.
- Scores estimate opportunity only — **not a sales guarantee**.
- Reddit OAuth is optional/blocked for new apps (Responsible Builder Policy); SerpAPI + Etsy are primary.

## Dashboard

- `/dashboard/trends` — live SerpAPI/Etsy + curated seeds
- `GET /api/trends` — admin session required
- Automation **trend_ingestion** / **trend_scoring** runs `runTrendEngine`

## MongoDB caching (cost control)

With `MONGODB_URI` set:

- **Designs / images** — first Google generate is saved in `CachedDesign` (bytes + prompt metadata). Later requests for the same slogan/concept/prompt version are **cache hits** (no Gemini call). Use **Force new** only when you want a fresh paid generation.
- **Trends** — SerpAPI / Etsy results cached ~12 hours per niche/source in `CachedTrendBatch` (TTL index).

Requires working Mongo (same SDHQ cluster / `bbsdesigns` database is fine).

## Graphic AI designs (Google Gemini)

1. Open [Google AI Studio](https://aistudio.google.com/apikey) → **Create API key**
2. Vercel env:
   - `IMAGE_PROVIDER=google` (or rely on auto-detect when `GEMINI_API` is set)
   - `IMAGE_API_KEY` or `GEMINI_API` = your Gemini API key
   - optional `IMAGE_MODEL=gemini-3.1-flash-image` (default; falls back to `gemini-2.5-flash-image`)
3. Redeploy
4. Designs page → **Generate AI design (Google)** for flashy/pop merch art

Prompts request dominant illustration + high-pop streetwear energy (not text-only).
