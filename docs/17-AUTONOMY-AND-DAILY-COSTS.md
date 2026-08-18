# 17 — Autonomy readiness & daily API costs

## What runs by itself

Vercel Cron (`vercel.json`) hits `GET /api/cron/automation` daily at **14:00 UTC**.

That bucket runs all automation jobs once per UTC day (idempotent):

| Stage | Output |
|---|---|
| Trends | Scored niche themes (SerpAPI/Etsy when keyed; else curated stubs) |
| **Text designs** | ~9 AI slogans/ideas/day (3 niches × 3) via Gemini text |
| Safety | Heuristic PASS / REVIEW / REJECT (no extra LLM in automation) |
| **Image designs** | Up to `MAX_AI_DESIGNS_PER_RUN` (default **5**) Gemini illustrations; upgrades SVG placeholders |
| Mockups / listings | Local mockup URLs + publishing queue rows |
| Publishing | **Gate only** — skipped while `HUMAN_APPROVAL=true` and `AUTO_PUBLISH=false` |
| Analytics / weekly | Metrics + narrative |

**Human step (by design):** Admin reviews Safety / Publishing and creates Shopify drafts. The AI fills the factory; it does not live-publish products under default gates.

Check live status: `GET /api/health` → `autonomy.readyForAutonomousGeneration`.

## Required env for autonomous generation

| Var | Why |
|---|---|
| `MONGODB_URI` | Persist ideas, designs, runs, pause flags |
| `GEMINI_API` or `IMAGE_API_KEY` / `AI_TEXT_API_KEY` | Text slogans + illustrated images |
| `CRON_SECRET` | Auth for cron (Vercel sends `Authorization: Bearer …`) |
| `AUTH_SECRET` + admin setup | Dashboard approvals |
| Shopify / Printify | Needed for **draft creation**, not for daily AI generation |
| `SERPAPI_API_KEY` / Etsy | Optional richer trends |

Optional: `MAX_AI_DESIGNS_PER_RUN=5`, `IMAGE_MODEL=gemini-3.1-flash-image`, `IMAGE_SIZE=2K`, `AI_TEXT_MODEL=gemini-2.5-flash`.

## Text + image confirmation

- **Text:** `idea_generation` → Mongo `Idea` slogans/concepts (`slogan-engine-v4-viral-flash`, Gemini `gemini-2.5-flash`).
- **Image:** `design_generation` → one flashy Gemini design with imagery + slogan locked together (`design-prompt-v8-viral-flash` at 2K). SVG is placeholder only when AI is unavailable.

## Predicted daily API costs (steady state)

Assumptions: paid Gemini Developer API rates (Aug 2026), 1 scheduled run/day, full AI budget used, SerpAPI cold once/day, no auto-publish.

| API | Volume / day | Unit price (approx.) | Daily $ |
|---|---|---|---|
| Gemini **text** (`gemini-2.5-flash`) | ~3 calls, ~2–4k tokens total | ~$0.30 / 1M in, $2.50 / 1M out (order-of-magnitude) | **~<$0.02** |
| Gemini **image** (`gemini-3.1-flash-image` @ **2K**) | ≤5 images | **~$0.101 / image** | **~$0.50** |
| Image prompt tokens | ~5 × short prompts | $0.50 / 1M input | **~<$0.01** |
| SerpAPI (optional) | ~6–9 searches if cache cold | plan-dependent (~$0.01–0.05) | **~$0.05–0.45** |
| Etsy (optional) | ~3 listings searches | free tier / plan | **~$0** |
| Shopify GraphQL reads | ~3 analytics/report calls | included in Shopify plan | **$0 API** |
| Printify / Shopify product create | 0 in cron | — | **$0** until you approve drafts |

### Totals

| Scenario | Daily | Monthly (×30) |
|---|---|---|
| **Core AI only** (Mongo + Gemini, no SerpAPI) | **~$0.55** | **~$16–17** |
| **+ SerpAPI trends** | **~$0.40–0.80** | **~$12–24** |
| **Stress** (`MAX_AI_DESIGNS_PER_RUN=20`, retries) | **~$1.40–1.60** | **~$42–48** |

Cache hits (same slogan/concept/prompt version) skip image billing. Raising `MAX_AI_DESIGNS_PER_RUN` scales image cost nearly linearly.

Prices change — verify [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Ops checklist

1. Deploy with Mongo + `GEMINI_API` + `CRON_SECRET`.
2. Confirm `GET /api/health` shows `autonomy.readyForAutonomousGeneration: true`.
3. Wait for 14:00 UTC cron (or `Run now` on Automation).
4. Designs page: real `/api/design-assets/…` art, not `PLACEHOLDER` SVG.
5. Approve listings → Create draft in Publishing (human).
