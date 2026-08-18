# 05 — Trend Scoring (Viral Flash)

Algorithm version: `viral-v1-flash-2026-08-r1` (`src/services/trends/viralAlgorithm.ts`).

Do not treat one viral post as proof of demand. Prefer SerpAPI + Etsy Open API (no storefront HTML scrapes).

## Default weights (sum = 1)

| Component | Weight | Why |
|---|---|---|
| Virality | 22% | Shareability + flash-design fit blend |
| Growth | 12% | Rising queries / momentum |
| Commercial intent | 20% | Shopping/Etsy marketplace demand |
| Audience fit | 12% | Niche + identity specificity |
| Seasonality | 18% | Holiday/occasion gift windows (4–8 weeks lead) |
| Evergreen potential | 6% | Repeat-buy identity humor |
| Competition | 10% | Crowding penalty (inverted in score) |

Also calculate (never allow publish bypass):
- IP risk
- Safety risk
- Designability / flash design fit
- Holiday boost
- Estimated margin

## Research pattern (2026)

Winning merch themes = **Identity × Interest × Occasion** (e.g. beer-league softball mom + Halloween), not generic “funny shirt”.

Flash aesthetics favored: retro/Y2K bubble type, maximalist neon, varsity arches, sarcastic humor graphics.

## Example

Trend: Beer League Softball Dugout Graphic  
Virality ~91, growth ~86, commercial ~92, audience ~96, seasonality high in season, IP low.

The score explanation always includes the algorithm version and states that scores do not bypass safety or guarantee sales.
