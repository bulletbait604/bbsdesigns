import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import { shoppingToSignals, trendsToSignals } from '@/providers/trend/serpapi'
import { listingToSignal, etsyApiKeyHeader } from '@/providers/trend/etsy'
import { createCompositeTrendProvider } from '@/providers/trend/composite'
import { createConfiguredTrendProvider } from '@/providers/trend'
import { buildDesignPrompt } from '@/services/designs/prompt'
import type { TrendProvider, TrendSignalDto } from '@/providers/types'

describe('serpapi trend mappers', () => {
  it('maps shopping results to theme signals', () => {
    const signals = shoppingToSignals('softball', [
      {
        title: 'Funny Beer League Softball Tee',
        source: 'ExampleShop',
        reviews: 120,
        rating: 4.5,
        product_id: 'abc',
      },
    ])
    expect(signals).toHaveLength(1)
    expect(signals[0].title).toMatch(/Softball/i)
    expect(signals[0].raw?.source).toBe('serpapi_google_shopping')
    expect(signals[0].summary).toMatch(/do not copy/i)
  })

  it('maps google trends related queries', () => {
    const signals = trendsToSignals('gaming', [
      { query: 'lag is a lifestyle shirt', extracted_value: 80 },
    ])
    expect(signals[0].keywords).toContain('google_trends')
    expect(signals[0].scoreHint).toBeGreaterThan(50)
  })
})

describe('etsy trend mappers', () => {
  afterEach(() => {
    resetEnvCache()
    delete process.env.ETSY_API_KEY
    delete process.env.ETSY_SHARED_SECRET
  })

  it('builds x-api-key as key:secret', () => {
    process.env.ETSY_API_KEY = 'keystring'
    process.env.ETSY_SHARED_SECRET = 'shared'
    resetEnvCache()
    expect(etsyApiKeyHeader()).toBe('keystring:shared')
  })

  it('maps listings without copying artwork instructions', () => {
    const signal = listingToSignal('baseball', {
      listing_id: 99,
      title: 'I Only Swing At Bad Ideas Shirt',
      num_favorers: 40,
      tags: ['baseball', 'funny'],
    })
    expect(signal?.externalId).toBe('etsy-99')
    expect(signal?.summary).toMatch(/never copy/i)
  })
})

describe('composite trend provider', () => {
  it('merges configured sources and skips failures', async () => {
    const ok: TrendProvider = {
      kind: 'trend',
      name: 'ok',
      validateConfig: () => ({ ok: true, missing: [] }),
      healthCheck: async () => ({
        ok: true,
        provider: 'ok',
        kind: 'trend',
        checkedAt: new Date().toISOString(),
      }),
      fetchSignals: async () =>
        [
          {
            externalId: '1',
            title: 'From OK',
            keywords: ['gaming'],
          },
        ] satisfies TrendSignalDto[],
    }
    const bad: TrendProvider = {
      kind: 'trend',
      name: 'bad',
      validateConfig: () => ({ ok: true, missing: [] }),
      healthCheck: async () => ({
        ok: true,
        provider: 'bad',
        kind: 'trend',
        checkedAt: new Date().toISOString(),
      }),
      fetchSignals: async () => {
        throw new Error('boom')
      },
    }
    const composite = createCompositeTrendProvider([ok, bad])
    const signals = await composite.fetchSignals({ niche: 'gaming', limit: 5 })
    expect(signals.some((s) => s.title === 'From OK')).toBe(true)
  })
})

describe('configured trend provider', () => {
  afterEach(() => {
    resetEnvCache()
    delete process.env.SERPAPI_API_KEY
    delete process.env.ETSY_API_KEY
    delete process.env.ETSY_SHARED_SECRET
  })

  it('falls back to stub when no keys', () => {
    resetEnvCache()
    const provider = createConfiguredTrendProvider()
    expect(provider.name).toContain('stub')
  })

  it('uses serpapi when only serp key set', () => {
    process.env.SERPAPI_API_KEY = 'test-key'
    resetEnvCache()
    const provider = createConfiguredTrendProvider()
    expect(provider.name).toBe('serpapi')
    expect(provider.validateConfig().ok).toBe(true)
  })
})

describe('design prompt graphics', () => {
  it('requires illustration not text-only', () => {
    const built = buildDesignPrompt({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept: 'high ping humor',
    })
    expect(built.prompt).toMatch(/illustration|graphic motif/i)
    expect(built.negativePrompt).toMatch(/text only/i)
  })
})

describe('serpapi fetch mock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetEnvCache()
    delete process.env.SERPAPI_API_KEY
  })

  it('fetchSignals returns mapped shopping rows', async () => {
    process.env.SERPAPI_API_KEY = 'k'
    resetEnvCache()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('google_shopping')) {
          return new Response(
            JSON.stringify({
              shopping_results: [{ title: 'Gamer Joke Tee', reviews: 10, rating: 4, product_id: '1' }],
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ related_queries: { rising: [] } }), { status: 200 })
      })
    )

    const { createSerpApiTrendProvider } = await import('@/providers/trend/serpapi')
    const provider = createSerpApiTrendProvider()
    const signals = await provider.fetchSignals({ niche: 'gaming', limit: 5 })
    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].title).toMatch(/Gamer/i)
  })
})
