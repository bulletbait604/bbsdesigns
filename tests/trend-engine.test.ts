import { describe, expect, it } from 'vitest'
import { dedupeTrends, titleSimilarity } from '@/services/trends/dedupe'
import { normalizeManualSignal } from '@/services/trends/normalize'
import { runTrendEngine } from '@/services/trends/engine'
import { fetchCuratedTrendSignals } from '@/services/trends/sources/curated'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'

describe('trend engine', () => {
  it('normalizes signals with source refs and timestamps', () => {
    const signal = normalizeManualSignal({
      niche: 'gaming',
      title: 'Lag is a Lifestyle',
      summary: 'queue jokes',
      keywords: ['Lag', 'Queue'],
      source: 'manual',
    })

    expect(signal.source).toBe('manual')
    expect(signal.externalId).toBeTruthy()
    expect(signal.sourceRefs[0]).toContain('manual:')
    expect(signal.observedAt).toBeInstanceOf(Date)
    expect(signal.keywords).toEqual(['lag', 'queue'])
  })

  it('deduplicates similar titles in the same niche', () => {
    const a = normalizeManualSignal({
      niche: 'softball',
      title: 'Funny Beer League Softball',
      source: 'curated',
    })
    const b = normalizeManualSignal({
      niche: 'softball',
      title: 'Funny Beer League Softball Nights',
      source: 'stub-trend',
      externalId: 'other-id',
    })

    expect(titleSimilarity(a.title, b.title)).toBeGreaterThan(0.5)
    const deduped = dedupeTrends([a, b], 0.5)
    expect(deduped).toHaveLength(1)
    expect(deduped[0].sourceRefs.length).toBeGreaterThanOrEqual(2)
  })

  it('collects gaming/baseball/softball curated sources and scores them', async () => {
    clearProviders()
    bootstrapProviders()

    const scored = await runTrendEngine({
      includeCurated: true,
      includeRegisteredTrendProvider: false,
    })

    const niches = new Set(scored.map((s) => s.signal.niche))
    expect(niches.has('gaming')).toBe(true)
    expect(niches.has('baseball')).toBe(true)
    expect(niches.has('softball')).toBe(true)
    expect(scored.every((s) => s.disclaimer.includes('never guarantee'))).toBe(true)
    expect(scored.every((s) => s.safetyBypassAllowed === false)).toBe(true)
  })

  it('exposes curated sample set used for scoring tests', () => {
    expect(fetchCuratedTrendSignals().length).toBeGreaterThanOrEqual(3)
  })
})
