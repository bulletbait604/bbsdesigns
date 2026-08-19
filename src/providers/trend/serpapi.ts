import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
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

type SerpOrganicResult = {
  title?: string
  link?: string
  snippet?: string
  position?: number
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
  const key = (getEnv().SERPAPI_API_KEY || process.env.SERPAPI_API_KEY || '').trim()
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
    headers: { 'User-Agent': 'bbsdesigns-trend-research/0.2' },
    cache: 'no-store',
  })

  const bodyText = await res.text().catch(() => '')
  let json: Record<string, unknown> = {}
  try {
    json = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {}
  } catch {
    json = { parse_error: true, body: bodyText.slice(0, 200) }
  }

  if (!res.ok) {
    throw new ProviderError(`SerpAPI HTTP ${res.status}`, {
      provider: 'serpapi',
      kind: 'trend',
      code: 'SERPAPI_HTTP',
      retryable: res.status >= 500 || res.status === 429,
      details: {
        status: res.status,
        body: bodyText.slice(0, 400),
        error: json.error,
      },
    })
  }

  if (typeof json.error === 'string' && json.error.trim()) {
    throw new ProviderError(`SerpAPI error: ${json.error}`, {
      provider: 'serpapi',
      kind: 'trend',
      code: 'SERPAPI_API_ERROR',
      retryable: /rate|limit|timeout|unavailable/i.test(json.error),
      details: { error: json.error },
    })
  }

  return json
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
        summary: `Google Shopping signal (${r.source || 'retailer'}). Theme research only — do not copy listing art.`,
        keywords: [niche, 'merch', 'shopping', 'google_shopping', ...(r.source ? [r.source.toLowerCase()] : [])],
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

export function organicToSignals(niche: Niche, results: SerpOrganicResult[]): TrendSignalDto[] {
  return results
    .filter((r) => r.title?.trim())
    .slice(0, 8)
    .map((r, i) => {
      const title = r.title!.trim().slice(0, 160)
      const snippet = (r.snippet || '').toLowerCase()
      const intentBoost =
        /\b(buy|shirt|tee|hoodie|etsy|amazon|gift|funny)\b/.test(snippet + ' ' + title.toLowerCase())
          ? 15
          : 0
      return {
        externalId: `serpapi-google-${niche}-${i}-${Buffer.from(title).toString('hex').slice(0, 10)}`,
        title,
        summary:
          'Google Search organic result theme. Research pattern only — never copy listing artwork or slogans.',
        keywords: [niche, 'google_search', 'organic', 'merch'],
        scoreHint: clampHint(50 + intentBoost + Math.max(0, 12 - (r.position || i))),
        observedAt: new Date().toISOString(),
        raw: {
          source: 'serpapi_google_search',
          link: r.link,
          snippet: r.snippet,
          position: r.position,
        },
      }
    })
}

async function fetchShoppingSignals(niche: Niche, query: string, limit: number): Promise<TrendSignalDto[]> {
  const shopping = await serpFetch({
    engine: 'google_shopping',
    q: query,
    num: String(Math.min(10, limit + 2)),
    hl: 'en',
    gl: 'us',
  })
  return shoppingToSignals(niche, (shopping.shopping_results || []) as SerpShoppingResult[])
}

/**
 * RELATED_QUERIES accepts exactly ONE query (SerpAPI rule).
 */
async function fetchTrendsRelatedSignals(niche: Niche, query: string): Promise<TrendSignalDto[]> {
  const trends = await serpFetch({
    engine: 'google_trends',
    q: query.slice(0, 100),
    data_type: 'RELATED_QUERIES',
    geo: 'US',
    date: 'today 3-m',
    hl: 'en',
  })
  const relatedBlock = trends.related_queries as
    | { rising?: SerpTrendsRelated[]; top?: SerpTrendsRelated[] }
    | undefined
  const related = relatedBlock?.rising?.length
    ? relatedBlock.rising
    : relatedBlock?.top || []
  return trendsToSignals(niche, related)
}

async function fetchGoogleSearchSignals(niche: Niche, query: string): Promise<TrendSignalDto[]> {
  const search = await serpFetch({
    engine: 'google',
    q: query,
    num: '10',
    hl: 'en',
    gl: 'us',
  })
  return organicToSignals(niche, (search.organic_results || []) as SerpOrganicResult[])
}

/**
 * SerpAPI trend provider: Google Shopping + Google Trends + Google Search.
 * Themes/keywords only — never copies third-party artwork.
 */
export function createSerpApiTrendProvider(name = 'serpapi'): TrendProvider {
  return {
    kind: 'trend',
    name,
    validateConfig(): ProviderConfigValidation {
      const key = (getEnv().SERPAPI_API_KEY || process.env.SERPAPI_API_KEY || '').trim()
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
      return health(name, true, 'SerpAPI configured (Shopping + Trends + Google Search)')
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
      const cacheSource = `serpapi:v3:${(await import('@/services/trends/viralAlgorithm')).VIRAL_ALGORITHM_VERSION}`
      const cached = await findCachedTrendSignals(niche, cacheSource)
      if (cached?.length) return cached.slice(0, limit)

      const { viralSearchQueries, primaryViralQuery } = await import(
        '@/services/trends/viralAlgorithm'
      )
      const queries = viralSearchQueries(niche)
      const primary = primaryViralQuery(niche)
      const shoppingQuery = queries[0] || primary
      const trendsQuery = niche // short single term for RELATED_QUERIES
      const searchQuery = queries[1] || `${niche} funny graphic tshirt`

      const signals: TrendSignalDto[] = []
      const errors: string[] = []

      const tasks: Array<{ label: string; run: () => Promise<TrendSignalDto[]> }> = [
        {
          label: 'google_shopping',
          run: () => fetchShoppingSignals(niche, shoppingQuery, limit),
        },
        {
          label: 'google_trends',
          run: () => fetchTrendsRelatedSignals(niche, trendsQuery),
        },
        {
          label: 'google_search',
          run: () => fetchGoogleSearchSignals(niche, searchQuery),
        },
      ]

      // Sequential to stay within SerpAPI rate limits / serverless time budgets
      for (const task of tasks) {
        try {
          const batch = await task.run()
          signals.push(...batch)
          logger.info('serpapi_source_ok', {
            niche,
            source: task.label,
            count: batch.length,
            query:
              task.label === 'google_shopping'
                ? shoppingQuery
                : task.label === 'google_trends'
                  ? trendsQuery
                  : searchQuery,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`${task.label}: ${message}`)
          logger.warn('serpapi_source_failed', { niche, source: task.label, error: message })
        }
      }

      if (!signals.length) {
        throw new ProviderError(
          `SerpAPI returned no signals for ${niche}. ${errors.join(' | ') || 'Unknown failure'}`,
          {
            provider: name,
            kind: 'trend',
            code: 'SERPAPI_EMPTY',
            retryable: true,
            details: { niche, errors },
          }
        )
      }

      const sliced = signals.slice(0, Math.max(limit, 12))
      await saveCachedTrendSignals(niche, cacheSource, sliced)
      return sliced.slice(0, limit)
    },
  }
}
