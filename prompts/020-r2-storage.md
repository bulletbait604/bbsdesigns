# Cursor Prompt 020 — Cloudflare R2 Storage

Wire a real storage provider for design assets.

## Requirements

- Implement StorageProvider for Cloudflare R2 (S3-compatible).
- Register when `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` are set.
- Public URLs via `R2_PUBLIC_URL` (custom domain or r2.dev).
- Design engine should upload bytes when storage validates OK.
- Keep stub storage when R2 is not configured.
- Do not commit secrets.

## Verify

typecheck, lint, tests, build.
