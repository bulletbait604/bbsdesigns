# Cursor Prompt 004 — Provider Architecture

Create provider interfaces for:

AI text
image generation
trend sources
image storage
Shopify
print-on-demand

The rest of the application must depend on interfaces, not specific vendors.

Each provider must support:
- health check
- configuration validation
- structured errors
- timeout
- retry policy where appropriate

Make it easy to add or replace providers later.
