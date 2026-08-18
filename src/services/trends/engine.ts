import type { Niche } from '@/types'
import { NICHES } from '@/lib/niches'
import { getProvider, tryGetProvider } from '@/providers/registry'
import { callProvider } from '@/providers/call'
import { normalizeTrendDto } from '@/services/trends/normalize'
import { dedupeTrends } from '@/services/trends/dedupe'
import { scoreTrend } from '@/services/trends/score'
import { fetchCuratedTrendSignals } from '@/services/trends/sources/curated'
import {
  inferNicheFromText,
  viralMarketplaceQueries,
  VIRAL_ALGORITHM_VERSION,
} from '@/services/trends/viralAlgorithm'
import type { NormalizedTrendSignal, ScoredTrend, TrendScoreWeights } from '@/services/trends/types'

export type TrendEngineOptions = {
  niches?: Niche[]
  includeCurated?: boolean
  includeRegisteredTrendProvider?: boolean
  includeViralMarketplace?: boolean
  limitPerNiche?: number
  weights?: Partial<TrendScoreWeights>
}

const DEFAULT_NICHES: Niche[] = [...NICHES]

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
    timeoutMs: 20_000,
  })

  return dtos.map((dto) => normalizeTrendDto(niche, provider.name, dto))
}

/**
 * Cross-niche viral marketplace / social-discovery pull via SerpAPI shopping.
 * Themes only — never copies artwork. No HTML scraping of Etsy/TikTok.
 */
async function collectViralMarketplaceSignals(limit = 12): Promise<NormalizedTrendSignal[]> {
  if (!process.env.SERPAPI_API_KEY) return []

  try {
    const { serpFetch, shoppingToSignals } = await import('@/providers/trend/serpapi')
    const queries = viralMarketplaceQueries()
    const out: NormalizedTrendSignal[] = []

    for (const q of queries.slice(0, 4)) {
      try {
        const shopping = await serpFetch({
          engine: 'google_shopping',
          q,
          num: '8',
          hl: 'en',
          gl: 'us',
        })
        const results = (shopping.shopping_results || []) as Array<{
          title?: string
          source?: string
          price?: string
          product_id?: string
          link?: string
          rating?: number
          reviews?: number
        }>
        for (const row of results) {
          if (!row.title) continue
          const niche = inferNicheFromText(row.title)
          const [signal] = shoppingToSignals(niche, [row])
          if (!signal) continue
          signal.summary = `Viral marketplace/social-discovery theme (${VIRAL_ALGORITHM_VERSION}). Research only — never copy art.`
          signal.keywords = [...(signal.keywords || []), 'viral', 'social', 'etsy', 'shopping']
          out.push(normalizeTrendDto(niche, 'serpapi-viral-marketplace', signal))
        }
      } catch {
        // continue
      }
      if (out.length >= limit) break
    }
    return out.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Trend engine: gather Etsy/SerpAPI/social-discovery + curated → normalize → dedupe → score.
 */
export async function runTrendEngine(options: TrendEngineOptions = {}): Promise<ScoredTrend[]> {
  const niches = options.niches?.length ? options.niches : DEFAULT_NICHES
  const includeCurated = options.includeCurated ?? true
  const includeRegistered = options.includeRegisteredTrendProvider ?? true
  const includeViral = options.includeViralMarketplace ?? true
  const limit = options.limitPerNiche ?? 3

  const gathered: NormalizedTrendSignal[] = []

  for (const niche of niches) {
    if (includeCurated) {
      gathered.push(...fetchCuratedTrendSignals(niche).slice(0, limit))
    }
    if (includeRegistered) {
      gathered.push(...(await collectFromRegisteredProvider(niche, limit)))
    }
  }

  if (includeViral) {
    gathered.push(...(await collectViralMarketplaceSignals(12)))
  }

  const unique = dedupeTrends(gathered)
  return unique.map((signal) => scoreTrend(signal, options.weights))
}

export function requireTrendProvider() {
  return getProvider('trend')
}
