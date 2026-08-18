# Cursor Prompt 026 — Publishing Queue Persistence

Hydrate the publishing queue from Mongo so approvals survive serverless restarts.

## Requirements

- Load `PublishingJob` docs into the in-memory queue on read.
- Keep persist-on-write behavior.
- Publishing API + dashboard use hydrate before list/get/process.
- Tests remain green without Mongo.

## Verify

typecheck, lint, tests, build.
