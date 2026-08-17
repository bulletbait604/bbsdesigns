import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatRow } from '@/components/dashboard/StatRow'
import { DEMO_APPROVALS, DEMO_STATS, DEMO_TRENDS } from '@/lib/dashboardData'

export default function DashboardOverviewPage() {
  return (
    <DashboardShell
      activePath="/dashboard"
      title="Overview"
      subtitle="Pipeline pulse for the merch factory. Demo numbers show until MongoDB and providers are connected."
    >
      <StatRow stats={DEMO_STATS} />

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Approval queue</h2>
            <Link href="/dashboard/safety" className="text-sm text-accent hover:underline">
              Open queue
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {DEMO_APPROVALS.map((item) => (
              <li key={item.id} className="border-b border-line/70 pb-3 last:border-0">
                <p className="text-sm text-text">{item.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.niche} · safety {item.safetyDecision} · trend {item.trendScore}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-line bg-panel/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Top trends</h2>
            <Link href="/dashboard/trends" className="text-sm text-accent hover:underline">
              All trends
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {DEMO_TRENDS.map((trend) => (
              <li key={trend.title} className="flex items-center justify-between gap-3 border-b border-line/70 pb-3 last:border-0">
                <div>
                  <p className="text-sm text-text">{trend.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {trend.niche} · {trend.status}
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-accent">{trend.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-md border border-line bg-panel/80 p-5">
        <h2 className="font-display text-xl font-bold">Next setup steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>
            Add <code className="text-accent-2">MONGODB_URI</code> in Vercel env vars.
          </li>
          <li>
            Connect Shopify + Printify on{' '}
            <Link href="/dashboard/providers" className="text-accent hover:underline">
              Providers
            </Link>
            .
          </li>
          <li>Wire AI text + image keys when you are ready to generate live slogans/designs.</li>
        </ol>
      </section>
    </DashboardShell>
  )
}
