import { getEnv } from '@/lib/env'
import { ProviderError } from '@/providers/errors'
import type {
  ProviderConfigValidation,
  ProviderHealth,
  TrendFetchRequest,
  TrendProvider,
  TrendSignalDto,
} from '@/providers/types'
import type { Niche } from '@/types'

type SerpShoppingResult = {
  title?: string
  source?: string
  price?: string
  product_id?: string
  link?: string
  rating?: number
  reviews?: number
}

type SerpTrendsRelated = {
  query?: string
  value?: string | number
  extracted_value?: number
}

function health(provider: string, ok: boolean, message?: string): ProviderHealth {
  return {
    ok,
    provider,
    kind: 'trend',
    message,
    checkedAt: new Date().toISOString(),
  }
}

function clampHint(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function serpFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = getEnv().SERPAPI_API_KEY
  if (!key) {
    throw new ProviderError('SERPAPI_API_KEY missing', {
      provider: 'serpapi',
      kind: 'trend',
      code: 'SERPAPI_CONFIG',
      retryable: false,
    })
  }

  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('api_key', key)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'bbsdesigns-trend-research/0.1' },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ProviderError(`SerpAPI HTTP ${res.status}`, {
      provider: 'serpapi',
      kind: 'trend',
      code: 'SERPAPI_HTTP',
      retryable: res.status >= 500 || res.status === 429,
      details: { status: res.status, body: body.slice(0, 300) },
    })
  }

  return (await res.json()) as Record<string, unknown>
}

export function shoppingToSignals(niche: Niche, results: SerpShoppingResult[]): TrendSignalDto[] {
  return results
    .filter((r) => r.title?.trim())
    .slice(0, 8)
    .map((r, i) => {
      const reviews = typeof r.reviews === 'number' ? r.reviews : 0
      const rating = typeof r.rating === 'number' ? r.rating : 0
      const commercial = clampHint(55 + Math.min(35, reviews / 20) + rating * 4)
      return {
        externalId: `serpapi-shop-${niche}-${r.product_id || i}-${Buffer.from(r.title!).toString('hex').slice(0, 10)}`,
        title: r.title!.trim().slice(0, 160),
        summary:
          `Google Shopping signal (${r.source || 'retailer'}). Theme research only — do not copy listing art.`,
        keywords: [niche, 'merch', 'shopping', ...(r.source ? [r.source.toLowerCase()] : [])],
        scoreHint: commercial,
        observedAt: new Date().toISOString(),
        raw: {
          source: 'serpapi_google_shopping',
          price: r.price,
          link: r.link,
          reviews,
          rating,
        },
      }
    })
}

export function trendsToSignals(niche: Niche, related: SerpTrendsRelated[]): TrendSignalDto[] {
  return related
    .filter((r) => r.query?.trim())
    .slice(0, 8)
    .map((r, i) => {
      const extracted =
        typeof r.extracted_value === 'number'
          ? r.extracted_value
          : typeof r.value === 'number'
            ? r.value
            : Number.parseInt(String(r.value || '0'), 10) || 40
      const virality = clampHint(40 + Math.min(50, extracted))
      return {
        externalId: `serpapi-trends-${niche}-${i}-${Buffer.from(r.query!).toString('hex').slice(0, 10)}`,
        title: r.query!.trim().slice(0, 160),
        summary: 'Google Trends related query. Opportunity estimate only — not a sales guarantee.',
        keywords: [niche, 'google_trends', 'search_demand'],
        scoreHint: virality,
        observedAt: new Date().toISOString(),
        raw: {
          source: 'serpapi_google_trends',
          value: r.value,
          extracted_value: r.extracted_value,
        },
      }
    })
}

/**
 * SerpAPI trend provider: Google Shopping + Google Trends for niche merch demand.
 * Extracts themes/keywords only — never copies third-party artwork.
 */
export function createSerpApiTrendProvider(name = 'serpapi'): TrendProvider {
  return {
    kind: 'trend',
    name,
    validateConfig(): ProviderConfigValidation {
      const key = getEnv().SERPAPI_API_KEY
      const missing = key ? [] : ['SERPAPI_API_KEY']
      return {
        ok: missing.length === 0,
        missing,
        message: missing.length ? `Missing config: ${missing.join(', ')}` : undefined,
      }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const validation = this.validateConfig()
      if (!validation.ok) return health(name, false, validation.message)
      return health(name, true, 'SerpAPI configured')
    },
    async fetchSignals(request: TrendFetchRequest): Promise<TrendSignalDto[]> {
      const validation = this.validateConfig()
      if (!validation.ok) {
        throw new ProviderError(validation.message || 'SerpAPI not configured', {
          provider: name,
          kind: 'trend',
          code: 'SERPAPI_CONFIG',
          retryable: false,
        })
      }

      const niche = request.niche
      const limit = request.limit ?? 6

      const { findCachedTrendSignals, saveCachedTrendSignals } = await import(
        '@/services/trends/cache'
      )
      // Cache key includes algorithm version via source tag so old batches are ignored after purge
      const cacheSource = `serpapi:${(await import('@/services/trends/viralAlgorithm')).VIRAL_ALGORITHM_VERSION}`
      const cached = await findCachedTrendSignals(niche, cacheSource)
      if (cached?.length) return cached.slice(0, limit)

      const { viralSearchQueries } = await import('@/services/trends/viralAlgorithm')
      const queries = viralSearchQueries(niche)
      const signals: TrendSignalDto[] = []

      // Shopping: primary + first occasion/viral alternate
      for (const q of queries.slice(0, 2)) {
        try {
          const shopping = await serpFetch({
            engine: 'google_shopping',
            q,
            num: String(Math.min(10, limit + 2)),
            hl: 'en',
            gl: 'us',
          })
          const shoppingResults = (shopping.shopping_results || []) as SerpShoppingResult[]
          signals.push(...shoppingToSignals(niche, shoppingResults))
        } catch {
          // continue
        }
      }

      try {
        const trends = await serpFetch({
          engine: 'google_trends',
          q: queries.slice(0, 2).join(','),
          data_type: 'RELATED_QUERIES',
          geo: 'US',
          date: 'today 3-m',
        })
        const relatedBlock = trends.related_queries as
          | { rising?: SerpTrendsRelated[]; top?: SerpTrendsRelated[] }
          | undefined
        const related =
          relatedBlock?.rising?.length ? relatedBlock.rising : relatedBlock?.top || []
        signals.push(...trendsToSignals(niche, related))
      } catch {
        // optional
      }

      const sliced = signals.slice(0, Math.max(limit, 10))
      await saveCachedTrendSignals(niche, cacheSource, sliced)
      return sliced.slice(0, limit)
    },
  }
}
