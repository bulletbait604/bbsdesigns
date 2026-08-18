# Cursor Prompt 024 — Durable Automation Runs

Persist automation runs so cron and dashboard survive serverless cold starts.

## Requirements

- Write/read `AutomationRun` in Mongo when `MONGODB_URI` is set.
- Keep in-memory Map as cache / test mode.
- Idempotency keys must hit Mongo on Vercel.
- Logs, status, summary, stats, trigger, attempts stored.
- Automation dashboard continues to work.

## Verify

typecheck, lint, tests, build.
