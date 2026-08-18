import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { getFeatureFlags } from '@/lib/featureFlags'
import { resolveAutomationMode } from '@/services/automation/modes'
import { ResearchOpportunityModel } from '@/models/ResearchOpportunity'

export const dynamic = 'force-dynamic'

type OppRow = {
  opportunityId: string
  topic: string
  niche: string
  opportunityScore: number
  scores?: {
    commerceScore?: number
    crossPlatformMomentumScore?: number
    designScore?: number
    ipRisk?: number
    velocityScore?: number
    giftIntentScore?: number
    seasonalScore?: number
    viralMomentumScore?: number
  }
  sources?: string[]
}

export default async function ViralRadarPage() {
  const flags = getFeatureFlags()
  const mode = resolveAutomationMode()

  let rows: OppRow[] = []
  let source: 'mongo' | 'empty' = 'empty'

  if (isMongoConfigured()) {
    await connectMongo()
    rows = (await ResearchOpportunityModel.find({})
      .sort({ opportunityScore: -1 })
      .limit(40)
      .lean()) as OppRow[]
    source = 'mongo'
  }

  const emerging = [...rows]
    .sort((a, b) => (b.scores?.velocityScore ?? 0) - (a.scores?.velocityScore ?? 0))
    .slice(0, 6)
  const cross = rows.filter((o) => (o.scores?.crossPlatformMomentumScore ?? 0) >= 70)
  const gifts = [...rows]
    .sort((a, b) => (b.scores?.giftIntentScore ?? 0) - (a.scores?.giftIntentScore ?? 0))
    .slice(0, 6)
  const seasonal = [...rows]
    .sort((a, b) => (b.scores?.seasonalScore ?? 0) - (a.scores?.seasonalScore ?? 0))
    .slice(0, 6)

  return (
    <DashboardShell
      title="Viral Radar"
      subtitle="Live Research V2 opportunities only — no demo filler. Run Automation → trend research to populate."
      activePath="/dashboard/viral-radar"
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mode" value={mode.mode.toUpperCase()} hint="Human approval stays on" />
        <Stat
          label="Opportunities"
          value={String(rows.length)}
          hint={source === 'mongo' ? 'From Mongo research' : 'Empty until research runs'}
        />
        <Stat label="Quality cap" value={`${flags.maxProductsPerDay}/day`} hint="Fewer, better products" />
        <Stat
          label="V2 flags"
          value={flags.useResearchV2 ? 'ON' : 'OFF'}
          hint={`design ${flags.useDesignV2 ? 'on' : 'off'}`}
        />
      </div>

      {!rows.length ? (
        <div className="rounded-md border border-line bg-panel/50 p-6 text-sm text-muted">
          <p>No research opportunities yet — slate is clean.</p>
          <p className="mt-2">
            Go to{' '}
            <Link href="/dashboard/automation" className="text-accent underline">
              Automation
            </Link>
            , erase creative data if needed, then run <strong>trend research</strong> →{' '}
            <strong>idea generation</strong>.
          </p>
        </div>
      ) : (
        <>
          <Section title="Top opportunities">
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Topic</th>
                    <th className="px-3 py-2">Niche</th>
                    <th className="px-3 py-2">Opp</th>
                    <th className="px-3 py-2">Commerce</th>
                    <th className="px-3 py-2">X-plat</th>
                    <th className="px-3 py-2">Design</th>
                    <th className="px-3 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.opportunityId} className="border-t border-line">
                      <td className="px-3 py-2 text-text">{o.topic}</td>
                      <td className="px-3 py-2 text-muted">{o.niche}</td>
                      <td className="px-3 py-2 font-medium text-accent">{o.opportunityScore}</td>
                      <td className="px-3 py-2">{o.scores?.commerceScore ?? '—'}</td>
                      <td className="px-3 py-2">{o.scores?.crossPlatformMomentumScore ?? '—'}</td>
                      <td className="px-3 py-2">{o.scores?.designScore ?? '—'}</td>
                      <td className="px-3 py-2">{o.scores?.ipRisk ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Emerging velocity">
              <List
                items={emerging.map(
                  (o) =>
                    `${o.topic} — velocity ${o.scores?.velocityScore ?? 0} / viral ${o.scores?.viralMomentumScore ?? 0}`
                )}
              />
            </Section>
            <Section title="Cross-platform">
              <List
                items={
                  cross.length
                    ? cross.map((o) => `${o.topic} — ${(o.sources || []).join(', ')}`)
                    : ['No multi-source hits yet']
                }
              />
            </Section>
            <Section title="Gift opportunities">
              <List items={gifts.map((o) => `${o.topic} — gift ${o.scores?.giftIntentScore ?? 0}`)} />
            </Section>
            <Section title="Seasonal forecast">
              <List
                items={seasonal.map((o) => `${o.topic} — seasonal ${o.scores?.seasonalScore ?? 0}`)}
              />
            </Section>
          </div>
        </>
      )}
    </DashboardShell>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-line bg-panel/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-1 text-2xl text-text">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 rounded-md border border-line bg-panel/40 p-4 text-sm text-muted">
      {items.map((item) => (
        <li key={item}>• {item}</li>
      ))}
    </ul>
  )
}
