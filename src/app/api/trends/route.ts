import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { runTrendEngine } from '@/services/trends/engine'
import type { Niche } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  bootstrapProviders()

  const { searchParams } = new URL(request.url)
  const nicheParam = searchParams.get('niche') as Niche | null
  const niches =
    nicheParam && ['gaming', 'baseball', 'softball'].includes(nicheParam)
      ? [nicheParam]
      : undefined

  const scored = await runTrendEngine({
    niches,
    includeCurated: searchParams.get('curated') !== '0',
    includeRegisteredTrendProvider: true,
    limitPerNiche: Number(searchParams.get('limit') || 5) || 5,
  })

  const trendProvider = tryGetProvider('trend')

  return NextResponse.json({
    ok: true,
    provider: trendProvider?.name || null,
    providerConfigured: trendProvider?.validateConfig().ok ?? false,
    count: scored.length,
    trends: scored.map((t) => ({
      title: t.signal.title,
      niche: t.signal.niche,
      source: t.signal.source,
      score: t.score,
      ipRisk: t.ipRisk,
      safetyRisk: t.safetyRisk,
      commercialPotential: t.commercialPotential,
      summary: t.signal.summary,
      keywords: t.signal.keywords,
      rawSource: t.signal.raw?.source || null,
    })),
    disclaimer: 'Scores estimate opportunity only — never a sales guarantee.',
  })
}
