import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { AnalyticsProductTable } from '@/components/dashboard/AnalyticsProductTable'
import { StatRow } from '@/components/dashboard/StatRow'
import { syncAnalyticsMetrics } from '@/services/analytics'

export const dynamic = 'force-dynamic'

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function AnalyticsPage() {
  const { report, source } = await syncAnalyticsMetrics()

  const stats = [
    { label: 'Views', value: String(report.totals.views), hint: 'Product page views' },
    { label: 'Sessions', value: String(report.totals.sessions), hint: 'Store sessions' },
    { label: 'Orders', value: String(report.totals.orders), hint: 'Paid orders' },
    { label: 'Conv %', value: String(report.totals.conversionRate), hint: 'Orders / sessions' },
    { label: 'Revenue', value: money(report.totals.revenueCents), hint: 'Gross revenue' },
    { label: 'Profit est.', value: money(report.totals.estimatedProfitCents), hint: 'After COGS estimate' },
  ]

  const traffic = Object.entries(report.trafficBySource).sort((a, b) => (b[1] || 0) - (a[1] || 0))

  return (
    <DashboardShell
      activePath="/dashboard/analytics"
      title="Analytics"
      subtitle="KEEP / OPTIMIZE / RETIRE_CANDIDATE from stored metrics only. Products are never auto-deleted."
    >
      <StatRow stats={stats} />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {(
          [
            ['KEEP', report.byDecision.KEEP],
            ['OPTIMIZE', report.byDecision.OPTIMIZE],
            ['RETIRE_CANDIDATE', report.byDecision.RETIRE_CANDIDATE],
          ] as const
        ).map(([label, count]) => (
          <div key={label} className="rounded-md border border-line bg-panel/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="font-display mt-2 text-3xl font-bold text-text">{count}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-text">Product performance</h2>
        <p className="mt-1 text-sm text-muted">
          {source === 'live'
            ? 'Live metrics from Products / Orders (and Shopify when connected).'
            : 'Demo seed until Mongo has products or orders to sync.'}{' '}
          Refunds tracked: {money(report.totals.refundsCents)}.
        </p>
        <div className="mt-4">
          <AnalyticsProductTable products={report.products} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="font-display text-xl font-bold">Traffic sources</h2>
          <ul className="mt-4 space-y-2">
            {traffic.map(([sourceKey, count]) => (
              <li
                key={sourceKey}
                className="flex items-center justify-between border-b border-line/70 pb-2 text-sm last:border-0"
              >
                <span className="text-muted">{sourceKey}</span>
                <span className="font-medium text-text">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="font-display text-xl font-bold">Weekly AI report</h2>
          <p className="mt-1 text-xs text-muted">
            Week {report.weekStart.slice(0, 10)} → {report.weekEnd.slice(0, 10)} · id {report.id} ·{' '}
            {source}
          </p>
          <p className="mt-4 text-sm leading-6 text-text">{report.summary}</p>
        </div>
      </section>
    </DashboardShell>
  )
}
