# Cursor Prompt 012 — Printify

Build a Printify provider adapter.

Requirements:
- connection test
- product catalog lookup
- product template mapping
- variants
- pricing
- image mapping
- order creation
- order status
- tracking
- errors/retries
- idempotency

Keep Printify isolated behind an interface so another POD provider can be added later.

Never claim an order is fulfilled until the provider confirms it.
