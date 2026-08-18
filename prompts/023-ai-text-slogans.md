# Cursor Prompt 023 — AI Text Provider (Slogans)

Wire a real AI text provider so slogan generation is not template-only.

## Requirements

- Implement `AiTextProvider` for Google Gemini (reuse `GEMINI_API` / `AI_TEXT_API_KEY`).
- Register in bootstrap when configured; keep stub fallback.
- `generateSloganCandidates` should call AI when available, with template bank as offline fallback.
- Keep originality + safety rules (no franchises, logos, celebrities).
- Cost-aware: short prompts, small candidate counts.

## Verify

typecheck, lint, tests, build.
