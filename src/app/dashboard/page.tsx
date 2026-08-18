import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatRow } from '@/components/dashboard/StatRow'
import { loadOverviewForDashboard } from '@/services/pipeline/dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardOverviewPage() {
  const { stats, approvals, trends, source, empty } = await loadOverviewForDashboard()

  return (
    <DashboardShell
      activePath="/dashboard"
      title="Overview"
      subtitle={
        source === 'mongo'
          ? empty
            ? 'Mongo connected — run Automation: trends → slogans → viral AI designs (art+text), then approve in Safety.'
            : 'Live pulse: research → slogans → one AI design with imagery + text → human approval before drafts.'
          : 'Demo pulse until Mongo is connected. Run automation for live counts.'
      }
    >
      <StatRow stats={stats} />

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Approval queue</h2>
            <Link href="/dashboard/safety" className="text-sm text-accent hover:underline">
              Open queue
            </Link>
          </div>
          {approvals.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No items awaiting approval. Run Automation: trend research → idea_generation →
              design_generation, then open Safety.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {approvals.map((item) => (
                <li key={item.id} className="border-b border-line/70 pb-3 last:border-0">
                  <p className="text-sm text-text">{item.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.niche} · safety {item.safetyDecision} · trend {item.trendScore}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-line bg-panel/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Top trends</h2>
            <Link href="/dashboard/trends" className="text-sm text-accent hover:underline">
              All trends
            </Link>
          </div>
          {trends.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No trend rows yet. Open Trends or run Automation → trend_ingestion.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {trends.map((trend) => (
                <li
                  key={`${trend.niche}-${trend.title}`}
                  className="flex items-center justify-between gap-3 border-b border-line/70 pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm text-text">{trend.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {trend.niche} · {trend.status}
                      {trend.source ? ` · ${trend.source}` : ''}
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold text-accent">{trend.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(empty || source === 'demo') && (
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
            <li>
              Add <code className="text-accent-2">SERPAPI_API_KEY</code> / Etsy keys for live theme
              research (otherwise curated seeds only).
            </li>
            <li>
              Add Gemini keys for slogans and viral AI designs (imagery + slogan text in one image).
              Publishing stays human-approved.
            </li>
          </ol>
        </section>
      )}
    </DashboardShell>
  )
}
