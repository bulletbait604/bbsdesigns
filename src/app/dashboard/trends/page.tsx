import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { runTrendEngine } from '@/services/trends/engine'

export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  bootstrapProviders()
  const provider = tryGetProvider('trend')
  const configured = provider?.validateConfig().ok ?? false

  let trends: Array<{
    niche: string
    title: string
    score: number
    status: string
    source: string
  }> = []

  let live = false
  let error: string | null = null

  try {
    const scored = await runTrendEngine({
      includeCurated: true,
      includeRegisteredTrendProvider: true,
      limitPerNiche: 4,
    })
    live = configured && scored.some((t) => t.signal.source !== 'curated')
    trends = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map((t) => ({
        niche: t.signal.niche,
        title: t.signal.title,
        score: t.score,
        status: t.ipRisk >= 40 ? 'ip_review' : 'scored',
        source: String(t.signal.raw?.source || t.signal.source),
      }))
  } catch (e) {
    error = e instanceof Error ? e.message : 'trend_engine_failed'
  }

  return (
    <DashboardShell
      activePath="/dashboard/trends"
      title="Trends"
      subtitle="Live demand research from SerpAPI / Etsy when configured, plus curated seeds. Scores estimate opportunity only — never a sales guarantee."
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded border border-line px-2 py-1 text-muted">
          Provider: <strong className="text-text">{provider?.name || 'none'}</strong>
        </span>
        <span className="rounded border border-line px-2 py-1 text-muted">
          Live sources:{' '}
          <strong className={configured ? 'text-ok' : 'text-warn'}>
            {configured ? (live ? 'yes' : 'configured / curated mix') : 'not configured'}
          </strong>
        </span>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Trend fetch issue: {error}
        </p>
      ) : null}

      {!trends.length ? (
        <p className="text-sm text-muted">
          No trend rows returned. Check SerpAPI/Etsy keys or run Automation → trend_ingestion.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Niche</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((trend) => (
                <tr key={`${trend.source}-${trend.title}`} className="border-t border-line/80">
                  <td className="px-4 py-3 text-accent-2">{trend.niche}</td>
                  <td className="px-4 py-3">{trend.title}</td>
                  <td className="px-4 py-3 text-muted">{trend.source}</td>
                  <td className="px-4 py-3 font-display text-accent">{trend.score}</td>
                  <td className="px-4 py-3 text-muted">{trend.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
