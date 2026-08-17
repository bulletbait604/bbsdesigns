import type { Niche } from '@/types'
import { getProvider, tryGetProvider } from '@/providers/registry'
import { callProvider } from '@/providers/call'
import { normalizeTrendDto } from '@/services/trends/normalize'
import { dedupeTrends } from '@/services/trends/dedupe'
import { scoreTrend } from '@/services/trends/score'
import { fetchCuratedTrendSignals } from '@/services/trends/sources/curated'
import type { NormalizedTrendSignal, ScoredTrend, TrendScoreWeights } from '@/services/trends/types'

export type TrendEngineOptions = {
  niches?: Niche[]
  includeCurated?: boolean
  includeRegisteredTrendProvider?: boolean
  limitPerNiche?: number
  weights?: Partial<TrendScoreWeights>
}

const DEFAULT_NICHES: Niche[] = ['gaming', 'baseball', 'softball']

async function collectFromRegisteredProvider(
  niche: Niche,
  limit: number
): Promise<NormalizedTrendSignal[]> {
  const provider = tryGetProvider('trend')
  if (!provider) return []

  const validation = provider.validateConfig()
  if (!validation.ok) return []

  const dtos = await callProvider(() => provider.fetchSignals({ niche, limit }), {
    provider: provider.name,
    kind: 'trend',
    label: `trend.fetch.${niche}`,
    retries: 1,
    timeoutMs: 15_000,
  })

  return dtos.map((dto) => normalizeTrendDto(niche, provider.name, dto))
}

/**
 * Trend engine: gather permitted sources → normalize → dedupe → score.
 * Does not claim sales outcomes; safety bypass is always disallowed.
 */
export async function runTrendEngine(options: TrendEngineOptions = {}): Promise<ScoredTrend[]> {
  const niches = options.niches?.length ? options.niches : DEFAULT_NICHES
  const includeCurated = options.includeCurated ?? true
  const includeRegistered = options.includeRegisteredTrendProvider ?? true
  const limit = options.limitPerNiche ?? 5

  const gathered: NormalizedTrendSignal[] = []

  for (const niche of niches) {
    if (includeCurated) {
      gathered.push(...fetchCuratedTrendSignals(niche).slice(0, limit))
    }
    if (includeRegistered) {
      gathered.push(...(await collectFromRegisteredProvider(niche, limit)))
    }
  }

  const unique = dedupeTrends(gathered)
  return unique.map((signal) => scoreTrend(signal, options.weights))
}

/** Convenience for callers that already bootstrapped providers. */
export function requireTrendProvider() {
  return getProvider('trend')
}
