# Cursor Prompt 019 — Live Pipeline Wiring

Numbered prompts 001–018 delivered engines and scaffolding. This phase wires them into a working factory loop.

## Goals

1. Persist scored trends, accepted slogans, safety reviews, and designs to Mongo when `MONGODB_URI` is set.
2. Replace stub automation handlers for:
   - idea generation
   - safety review
   - design generation (cache-first; SVG fallback if image API unavailable; hard cap per run)
   - image review
   - mockups
   - listing preparation
3. Keep publishing gated: HUMAN_APPROVAL=true, AUTO_PUBLISH=false — never auto-publish.
4. Ideas and Safety Queue dashboards read live Mongo data (demo catalog only as empty-state fallback).
5. Approval actions: Approve / Reject update Idea (and Design) status; Publish stays locked.
6. Cost control: reuse CachedDesign; limit paid image generations per automation run.

## Non-goals

- R2 storage provider (can follow in 020)
- Live Shopify metrics sync
- Webhooks

## Verify

typecheck, lint, tests, build.
