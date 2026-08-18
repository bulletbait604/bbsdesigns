import { getEnv } from '@/lib/env'
import { ProviderError } from '@/providers/errors'
import type {
  ProviderConfigValidation,
  ProviderHealth,
  TrendFetchRequest,
  TrendProvider,
  TrendSignalDto,
} from '@/providers/types'
import { primaryTrendQuery } from '@/services/trends/queries'
import type { Niche } from '@/types'

type EtsyListing = {
  listing_id?: number
  title?: string
  description?: string
  url?: string
  num_favorers?: number
  views?: number
  tags?: string[]
  taxonomy_path?: string[]
  price?: { amount?: number; divisor?: number; currency_code?: string }
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

/** Etsy x-api-key is keystring:shared_secret */
export function etsyApiKeyHeader(): string {
  const env = getEnv()
  const key = (env.ETSY_API_KEY || '').trim()
  const secret = (env.ETSY_SHARED_SECRET || '').trim()
  if (!key) return ''
  if (key.includes(':')) return key
  if (!secret) return key
  return `${key}:${secret}`
}

export function listingToSignal(niche: Niche, listing: EtsyListing): TrendSignalDto | null {
  const title = listing.title?.trim()
  if (!title || listing.listing_id == null) return null

  const favorers = listing.num_favorers ?? 0
  const views = listing.views ?? 0
  const commercial = clampHint(50 + Math.min(40, favorers / 5 + views / 200))
  const tags = (listing.tags || []).map((t) => t.toLowerCase()).slice(0, 8)

  return {
    externalId: `etsy-${listing.listing_id}`,
    title: title.slice(0, 160),
    summary:
      'Etsy active listing theme. Use for demand/keyword research only — never copy artwork or trademarks.',
    keywords: [niche, 'etsy', 'merch', ...tags],
    scoreHint: commercial,
    observedAt: new Date().toISOString(),
    raw: {
      source: 'etsy_listings_active',
      listing_id: listing.listing_id,
      url: listing.url,
      num_favorers: favorers,
      views,
      taxonomy_path: listing.taxonomy_path,
    },
  }
}

async function etsyFetchListings(keywords: string, limit: number): Promise<EtsyListing[]> {
  const apiKey = etsyApiKeyHeader()
  if (!apiKey) {
    throw new ProviderError('ETSY_API_KEY missing', {
      provider: 'etsy',
      kind: 'trend',
      code: 'ETSY_CONFIG',
      retryable: false,
    })
  }

  const url = new URL('https://openapi.etsy.com/v3/application/listings/active')
  url.searchParams.set('keywords', keywords)
  url.searchParams.set('limit', String(Math.min(25, Math.max(1, limit))) )
  url.searchParams.set('sort_on', 'score')
  url.searchParams.set('sort_order', 'desc')

  const res = await fetch(url.toString(), {
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
      'User-Agent': 'bbsdesigns-trend-research/0.1',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ProviderError(`Etsy HTTP ${res.status}`, {
      provider: 'etsy',
      kind: 'trend',
      code: 'ETSY_HTTP',
      retryable: res.status >= 500 || res.status === 429,
      details: { status: res.status, body: body.slice(0, 400) },
    })
  }

  const data = (await res.json()) as { results?: EtsyListing[] }
  return data.results || []
}

/**
 * Etsy Open API trend provider — active listing search by niche keywords.
 * Themes/favorites only; does not copy designs.
 */
export function createEtsyTrendProvider(name = 'etsy'): TrendProvider {
  return {
    kind: 'trend',
    name,
    validateConfig(): ProviderConfigValidation {
      const env = getEnv()
      const missing: string[] = []
      if (!env.ETSY_API_KEY) missing.push('ETSY_API_KEY')
      if (!env.ETSY_SHARED_SECRET && !env.ETSY_API_KEY.includes(':')) {
        missing.push('ETSY_SHARED_SECRET')
      }
      return {
        ok: missing.length === 0,
        missing,
        message: missing.length ? `Missing config: ${missing.join(', ')}` : undefined,
      }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const validation = this.validateConfig()
      if (!validation.ok) return health(name, false, validation.message)
      return health(name, true, 'Etsy API key configured')
    },
    async fetchSignals(request: TrendFetchRequest): Promise<TrendSignalDto[]> {
      const validation = this.validateConfig()
      if (!validation.ok) {
        throw new ProviderError(validation.message || 'Etsy not configured', {
          provider: name,
          kind: 'trend',
          code: 'ETSY_CONFIG',
          retryable: false,
        })
      }

      const limit = request.limit ?? 6

      const { findCachedTrendSignals, saveCachedTrendSignals } = await import(
        '@/services/trends/cache'
      )
      const cached = await findCachedTrendSignals(request.niche, 'etsy')
      if (cached?.length) return cached.slice(0, limit)

      const listings = await etsyFetchListings(primaryTrendQuery(request.niche), limit + 4)
      const signals = listings
        .map((listing) => listingToSignal(request.niche, listing))
        .filter((s): s is TrendSignalDto => Boolean(s))
        .slice(0, Math.max(limit, 8))

      await saveCachedTrendSignals(request.niche, 'etsy', signals)
      return signals.slice(0, limit)
    },
  }
}
