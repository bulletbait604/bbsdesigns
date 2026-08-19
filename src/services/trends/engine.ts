import type { Niche } from '@/types'
import { NICHES } from '@/lib/niches'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
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

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function workerLoop() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i]!, i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, () => workerLoop())
  )
  return results
}

async function collectFromRegisteredProvider(
  niche: Niche,
  limit: number
): Promise<{ signals: NormalizedTrendSignal[]; error?: string }> {
  const provider = tryGetProvider('trend')
  if (!provider) return { signals: [], error: 'trend_provider_missing' }

  const validation = provider.validateConfig()
  if (!validation.ok) {
    return { signals: [], error: validation.message || 'trend_provider_not_configured' }
  }

  try {
    const dtos = await callProvider(() => provider.fetchSignals({ niche, limit }), {
      provider: provider.name,
      kind: 'trend',
      label: `trend.fetch.${niche}`,
      retries: 1,
      timeoutMs: 55_000,
    })
    return {
      signals: dtos.map((dto) => normalizeTrendDto(niche, provider.name, dto)),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('trend_provider_niche_failed', { niche, error: message })
    return { signals: [], error: message }
  }
}

/**
 * Cross-niche viral marketplace / social-discovery pull via SerpAPI shopping.
 * Themes only — never copies artwork.
 */
async function collectViralMarketplaceSignals(limit = 8): Promise<NormalizedTrendSignal[]> {
  const key = (getEnv().SERPAPI_API_KEY || process.env.SERPAPI_API_KEY || '').trim()
  if (!key) return []

  try {
    const { serpFetch, shoppingToSignals } = await import('@/providers/trend/serpapi')
    const queries = viralMarketplaceQueries()
    const out: NormalizedTrendSignal[] = []

    // Keep this lean — full niche SerpAPI already covers Shopping/Trends/Search
    for (const q of queries.slice(0, 2)) {
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
      } catch (error) {
        logger.warn('viral_marketplace_query_failed', {
          query: q,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      if (out.length >= limit) break
    }
    return out.slice(0, limit)
  } catch (error) {
    logger.warn('viral_marketplace_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Trend engine: SerpAPI (Shopping + Trends + Google Search) + Etsy + curated → score.
 */
export async function runTrendEngine(options: TrendEngineOptions = {}): Promise<ScoredTrend[]> {
  const niches = options.niches?.length ? options.niches : DEFAULT_NICHES
  const includeCurated = options.includeCurated ?? true
  const includeRegistered = options.includeRegisteredTrendProvider ?? true
  const includeViral = options.includeViralMarketplace ?? true
  const limit = options.limitPerNiche ?? 3

  const gathered: NormalizedTrendSignal[] = []
  const nicheErrors: Array<{ niche: Niche; error: string }> = []

  if (includeCurated) {
    for (const niche of niches) {
      gathered.push(...fetchCuratedTrendSignals(niche).slice(0, limit))
    }
  }

  if (includeRegistered) {
    const liveBatches = await mapPool(niches, 2, async (niche) => {
      const result = await collectFromRegisteredProvider(niche, limit)
      if (result.error) nicheErrors.push({ niche, error: result.error })
      return result.signals
    })
    for (const batch of liveBatches) gathered.push(...batch)
  }

  if (includeViral) {
    gathered.push(...(await collectViralMarketplaceSignals(8)))
  }

  if (nicheErrors.length) {
    logger.warn('trend_engine_partial_failures', {
      failures: nicheErrors.length,
      sample: nicheErrors.slice(0, 3),
    })
  }

  const unique = dedupeTrends(gathered)
  const scored = unique.map((signal) => scoreTrend(signal, options.weights))

  // Attach diagnostics on the first scored item for job stats (non-breaking)
  if (scored[0]) {
    ;(scored[0] as ScoredTrend & { _diagnostics?: unknown })._diagnostics = {
      niches: niches.length,
      gathered: gathered.length,
      unique: unique.length,
      nicheErrors,
      serpConfigured: Boolean((getEnv().SERPAPI_API_KEY || '').trim()),
    }
  }

  return scored
}

export function requireTrendProvider() {
  return getProvider('trend')
}
