# Cursor Prompt 013 — Publishing Queue

Build a publishing queue.

Statuses:
DRAFT
READY_FOR_REVIEW
APPROVED
PUBLISHING
PUBLISHED
FAILED
REJECTED

A product is READY only if:
- slogan passes safety
- image passes safety
- quality threshold passes
- title/description/tags validate
- price is valid
- required media exists
- variants exist

Add retry and idempotency.
