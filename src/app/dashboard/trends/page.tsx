import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { runTrendEngine } from '@/services/trends/engine'

export const dynamic = 'force-dynamic'

function researchModeLabel(input: {
  providerName: string
  configured: boolean
  hasVendorRows: boolean
}): { label: string; ok: boolean } {
  const name = input.providerName.toLowerCase()
  if (name.includes('stub') || !input.configured) {
    return { label: 'Curated / stub only (add SerpAPI or Etsy for live research)', ok: false }
  }
  if (input.hasVendorRows) {
    return { label: `Live research (${input.providerName})`, ok: true }
  }
  return { label: `Keys set (${input.providerName}) — showing curated mix`, ok: true }
}

export default async function TrendsPage() {
  bootstrapProviders()
  const provider = tryGetProvider('trend')
  const providerName = provider?.name || 'none'
  const configured = provider?.validateConfig().ok ?? false

  let trends: Array<{
    niche: string
    title: string
    score: number
    status: string
    source: string
  }> = []

  let hasVendorRows = false
  let error: string | null = null

  try {
    const scored = await runTrendEngine({
      includeCurated: true,
      includeRegisteredTrendProvider: true,
      limitPerNiche: 4,
    })
    hasVendorRows = scored.some((t) => {
      const src = String(t.signal.raw?.source || t.signal.source).toLowerCase()
      return src.includes('serpapi') || src.includes('etsy') || src.includes('google')
    })
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

  const mode = researchModeLabel({ providerName, configured, hasVendorRows })

  return (
    <DashboardShell
      activePath="/dashboard/trends"
      title="Trends"
      subtitle="Viral Flash research across pets, teacher, nurse, humor, retro, bookish + sports/gaming. SerpAPI/Etsy/social-discovery queries when keyed — opportunity only, not sales."
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded border border-line px-2 py-1 text-muted">
          Provider: <strong className="text-text">{providerName}</strong>
        </span>
        <span className="rounded border border-line px-2 py-1 text-muted">
          Research:{' '}
          <strong className={mode.ok ? 'text-ok' : 'text-warn'}>{mode.label}</strong>
        </span>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Trend fetch issue: {error}
        </p>
      ) : null}

      {!mode.ok ? (
        <p className="mb-4 text-sm text-muted">
          Set <code className="text-accent-2">SERPAPI_API_KEY</code> and/or Etsy keys, then run
          Automation → trend research. Until then you only see curated/stub themes.
        </p>
      ) : null}

      {!trends.length ? (
        <p className="text-sm text-muted">
          No trend rows returned. Check SerpAPI/Etsy keys or run Automation → trend research.
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
