# Cursor Prompt 001 — Master Project

You are the lead engineer for AI Merch Factory.

Build a production-ready Shopify-first AI print-on-demand automation platform.

CORE GOAL
Find legitimate trend signals, score commercial opportunities, generate ORIGINAL funny gaming/baseball/softball merchandise ideas, run strict IP/TOS safety checks, generate designs, prepare Shopify listings, connect a print-on-demand provider, and track performance.

TECHNICAL REQUIREMENTS
- TypeScript.
- Next.js App Router.
- MongoDB.
- Clean modular architecture.
- Provider interfaces for AI, image generation, trends, storage, Shopify and POD.
- No hard-coded secrets.
- Environment validation.
- Structured logging.
- Audit logs.
- Retries with exponential backoff.
- Idempotent jobs.
- Feature flags.
- HUMAN_APPROVAL mode enabled by default.
- AUTO_PUBLISH disabled by default.

SAFETY
Never publish a product that fails safety review.
Never let a high trend score override a safety rejection.
Do not generate or imitate protected franchises, characters, logos, sports marks, celebrities, or copyrighted slogans.
Use PASS, REVIEW and REJECT.

SHOPIFY
Use the current Shopify GraphQL Admin API.
Do not implement legacy REST product creation.

DATA PROVENANCE
Every generated product must retain:
- source trend IDs
- slogan/idea ID
- prompt version
- model/provider
- image asset
- safety review
- quality score
- timestamps
- publishing status

TREND DATA
Use official APIs or permitted/public sources. Do not implement scraping that violates a site's terms.

INITIAL NICHES
- gaming humor
- baseball humor
- softball humor

STYLE
Funny, sarcastic, cheeky and mildly risqué without explicit sexual content, hateful content, slurs, threats, graphic violence or targeted harassment.

IMPLEMENTATION PROCESS
First inspect the repository.
Then create a short plan.
Implement incrementally.
Run typecheck, lint, tests and build.
Fix errors before moving on.

At the end report:
1. files created
2. files changed
3. environment variables
4. commands
5. tests
6. remaining TODOs
