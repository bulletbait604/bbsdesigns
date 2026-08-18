'use client'

import type { LifecycleDecision, ProductPerformance } from '@/services/analytics/types'

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function decisionClass(decision: LifecycleDecision): string {
  if (decision === 'KEEP') return 'bg-ok/15 text-ok'
  if (decision === 'OPTIMIZE') return 'bg-warn/20 text-warn'
  return 'bg-danger/20 text-danger'
}

export function AnalyticsProductTable({ products }: { products: ProductPerformance[] }) {
  if (!products.length) {
    return (
      <p className="rounded-md border border-line bg-panel/60 p-4 text-sm text-muted">
        No stored product metrics for this week yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-ink-2 text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Views</th>
            <th className="px-3 py-2 font-medium">Sessions</th>
            <th className="px-3 py-2 font-medium">ATC</th>
            <th className="px-3 py-2 font-medium">Orders</th>
            <th className="px-3 py-2 font-medium">Conv%</th>
            <th className="px-3 py-2 font-medium">Revenue</th>
            <th className="px-3 py-2 font-medium">Profit est.</th>
            <th className="px-3 py-2 font-medium">Decision</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productKey} className="border-t border-line/80 bg-panel/50">
              <td className="px-3 py-3">
                <p className="font-medium text-text">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">{p.niche}</p>
              </td>
              <td className="px-3 py-3 text-text">{p.views}</td>
              <td className="px-3 py-3 text-text">{p.sessions}</td>
              <td className="px-3 py-3 text-text">{p.addToCart}</td>
              <td className="px-3 py-3 text-text">{p.orders}</td>
              <td className="px-3 py-3 text-text">{p.conversionRate}</td>
              <td className="px-3 py-3 text-text">{money(p.revenueCents)}</td>
              <td className="px-3 py-3 text-text">{money(p.estimatedProfitCents)}</td>
              <td className="px-3 py-3">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${decisionClass(p.decision)}`}>
                  {p.decision}
                </span>
                <p className="mt-1 max-w-[10rem] text-[11px] text-muted">
                  {p.decisionReasons.join(', ')}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
