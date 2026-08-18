# 20 — Major research + design overhaul report

## 1. What the current system does

Daily automation (cron 14:00 UTC) runs:

`trend_ingestion` → `idea_generation` (slogans) → `safety_review` → `design_generation` (Gemini Pro 4K) → `image_review` → `mockups` → `listing_preparation` → gated `publishing` → analytics.

Defaults: `HUMAN_APPROVAL=true`, `AUTO_PUBLISH=false` (Shopify drafts only after human approval). Niches: gaming, baseball, softball, pets, teacher, nurse, humor, retro, bookish. Trends use SerpAPI Shopping/Trends + Etsy Open API + curated seeds (no ToS-violating HTML scrapes).

## 2. Why designs are still weak

- Pipeline is **slogan-first**, not creative-director-first.
- One image per idea; no multi-concept / multi-style competition.
- Image review is **heuristic** (no vision scoring for impact/typography/composition).
- Flash formulas help, but briefs are still thin vs. commercial merch art direction.
- SVG placeholders and budget caps historically flooded the gallery with weak art.

## 3. Why trend research is still weak

- Scores blend virality/commerce but do not fully separate **trend chatter** vs **buyer intent**.
- Limited cross-platform confirmation model (mostly Shopping + Etsy + curated).
- Weak clustering / combination engine (trend × audience × humor × style).
- Little storage of structured visual-pattern observations (commerce patterns).

## 4. Controlling files

| Area | Paths |
|---|---|
| Automation | `src/services/automation/scheduler.ts`, `jobs.ts`, `pipeline/jobs.ts` |
| Trends | `trends/engine.ts`, `score.ts`, `viralAlgorithm.ts`, `providers/trend/*` |
| Slogans | `slogans/engine.ts`, `generate.ts` |
| Designs | `designs/engine.ts`, `prompt.ts`, `imageReview.ts`, `providers/image/google.ts` |
| Safety / publish | `safety/engine.ts`, `publishing/draftFromApproval.ts` |
| Flags | `lib/env.ts`, `lib/featureFlags.ts` |

## 5. What we will change (V2, additive)

**Keep V1 engines.** Add:

- `USE_RESEARCH_V2` / `USE_DESIGN_V2` / `USE_PRODUCT_INTELLIGENCE_V2` flags
- **Research Engine V2**: ResearchOpportunity records, opportunity score (velocity/commerce/design/originality/seasonality/competition/IP), cross-platform momentum, concept combinations, style library matching
- **Design Engine V2**: creative brief → 4–5 style directions → generate best → strict design review (impact/typography/commercial) → reject weak
- **Product Intelligence V2**: DesignDNA + performance hooks from analytics
- Quality over quantity: `MAX_PRODUCTS_PER_DAY`, higher V2 review gates
- Stay in **REVIEW MODE** (human approval, no auto-publish)

Deferred to follow-ups (explicitly not blocking V2 core): multi-mockup lifestyle set, Reddit/Pinterest adapters until keys exist, Temu/Amazon scrapers (not permitted).

## Philosophy shift

`TREND → SLOGAN → IMAGE`  
→  
`RESEARCH → VALIDATE → CONCEPT DIRECTIONS → STYLE MATCH → CREATIVE BRIEF → ART+TYPE → DESIGN REVIEW → SAFETY → HUMAN APPROVAL`

## Implementation status (shipped)

| Piece | Location |
|---|---|
| Feature flags | `src/lib/featureFlags.ts` |
| Research Engine V2 | `src/services/researchV2/*` |
| Design Engine V2 | `src/services/designV2/*` |
| Product Intelligence V2 | `src/services/productIntelligenceV2/*` |
| Automation modes | `src/services/automation/modes.ts` (default `review`) |
| Pipeline wiring | `src/services/pipeline/jobs.ts` + `overhaulDemo.ts` |
| Viral Radar UI | `src/app/dashboard/viral-radar/page.tsx` |
| Demo API | `GET /api/overhaul?run=1` |
| Pipeline report | `docs/21-OVERHAUL-PIPELINE-RUN.md` (from tests) |

Rollback: set `USE_RESEARCH_V2=false`, `USE_DESIGN_V2=false`, `USE_PRODUCT_INTELLIGENCE_V2=false`.
