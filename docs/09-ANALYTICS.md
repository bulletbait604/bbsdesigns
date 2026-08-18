# 09 — Analytics

Track only **real stored metrics**:

- views, sessions, add-to-cart, checkout, orders
- conversion rate, revenue, estimated profit, refunds
- traffic source

## Lifecycle decisions (advisory)

| Decision | Meaning |
|---|---|
| `KEEP` | Healthy conversion / profit signal |
| `OPTIMIZE` | Interest or traffic but weak conversion |
| `RETIRE_CANDIDATE` | Low traffic + no sales, traffic with no orders, or high refunds |

**Do not automatically delete products.** `RETIRE_CANDIDATE` is for human review only.

## Weekly reports

Generated from stored metrics only. The narrative must not invent KPIs.

Engine: `src/services/analytics/`  
API: `GET/POST /api/analytics` (admin session required)  
Dashboard: `/dashboard/analytics`
