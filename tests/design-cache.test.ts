import { describe, expect, it } from 'vitest'
import { buildDesignCacheKey } from '@/services/designs/cache'
import { buildTrendCacheKey } from '@/services/trends/cache'

describe('mongo cost-saving cache keys', () => {
  it('design cache key is stable for same slogan/concept', () => {
    const a = buildDesignCacheKey({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept: 'flashy',
    })
    const b = buildDesignCacheKey({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept: 'flashy',
    })
    const c = buildDesignCacheKey({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept: 'different',
    })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('trend cache key is per niche/source/day', () => {
    const a = buildTrendCacheKey('softball', 'serpapi', '2026-08-18')
    const b = buildTrendCacheKey('softball', 'serpapi', '2026-08-18')
    const c = buildTrendCacheKey('softball', 'etsy', '2026-08-18')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
