# AI Merch Factory — architecture plan (prompt 001)

## Goal
Shopify-first POD pipeline: trends → score → slogans → safety → designs → review → Shopify drafts → Printify → analytics → retirement.

## Stack
- Next.js App Router + TypeScript + Tailwind
- MongoDB
- Provider interfaces (AI text, image, trends, storage, Shopify GraphQL Admin, Printify)
- Vercel deployment

## Modes
- `HUMAN_APPROVAL=true` (default)
- `AUTO_PUBLISH=false` (default)

## Modules (build order)
1. Foundation + env validation + logging ✅
2. MongoDB models ✅
3. Provider interfaces ✅ (auth + dashboard shell come with later prompts; numbered prompts are source of truth)
4. Trend engine + scoring ✅
5. Slogan + safety engines ✅
6. Image generation + review + mockups
7. Shopify + Printify + publishing queue
8. Analytics, retirement, scheduler, tests, launch

## Non-negotiables
- No hard-coded secrets
- Idempotent jobs + retries
- Full product provenance
- Safety PASS / REVIEW / REJECT — REJECT always wins
- Shopify via GraphQL Admin API only
