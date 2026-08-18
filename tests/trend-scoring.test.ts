import { describe, expect, it } from 'vitest'
import { DEFAULT_TREND_WEIGHTS, normalizeWeights, scoreTrend } from '@/services/trends/score'
import { normalizeManualSignal } from '@/services/trends/normalize'
import { fetchCuratedTrendSignals } from '@/services/trends/sources/curated'
import {
  VIRAL_ALGORITHM_VERSION,
  VIRAL_TREND_WEIGHTS,
  viralSearchQueries,
  scoreFlashDesignFit,
  scoreIdentitySpecificity,
} from '@/services/trends/viralAlgorithm'

describe('trend scoring', () => {
  it('uses Viral Flash default weights', () => {
    expect(DEFAULT_TREND_WEIGHTS).toMatchObject({ ...VIRAL_TREND_WEIGHTS })
    expect(DEFAULT_TREND_WEIGHTS.commercialIntent).toBe(0.2)
    expect(DEFAULT_TREND_WEIGHTS.seasonality).toBe(0.16)
    expect(DEFAULT_TREND_WEIGHTS.virality).toBe(0.24)
  })

  it('normalizes custom weights to sum to 1', () => {
    const weights = normalizeWeights({
      virality: 2,
      growth: 2,
      commercialIntent: 0,
      audienceFit: 0,
      seasonality: 0,
      evergreenPotential: 0,
      competition: 0,
    })
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
    expect(weights.virality).toBeCloseTo(0.5, 5)
  })

  it('scores sample beer-league softball trend with components + explanation', () => {
    const sample = fetchCuratedTrendSignals('softball').find((s) =>
      s.title.toLowerCase().includes('beer league')
    )
    expect(sample).toBeTruthy()

    const scored = scoreTrend(sample!)
    expect(scored.score).toBeGreaterThan(70)
    expect(scored.components.virality).toBe(91)
    expect(scored.components.growth).toBe(86)
    expect(scored.components.commercialIntent).toBe(92)
    expect(scored.components.audienceFit).toBe(96)
    expect(scored.ipRisk).toBeLessThan(10)
    expect(scored.explanation).toContain('Viral Flash')
    expect(scored.explanation).toContain(VIRAL_ALGORITHM_VERSION)
    expect(scored.explanation).toContain('does not bypass safety')
    expect(scored.safetyBypassAllowed).toBe(false)
  })

  it('flags IP risk on franchise-like trends even with high commercial hints', () => {
    const risky = normalizeManualSignal({
      niche: 'gaming',
      title: 'Official Mario Kart Championship Tee',
      summary: 'nintendo mario merch',
      keywords: ['mario', 'nintendo'],
      hints: {
        virality: 95,
        growth: 90,
        commercialIntent: 95,
        audienceFit: 80,
        competition: 40,
        ipRisk: 95,
      },
    })

    const scored = scoreTrend(risky)
    expect(scored.score).toBeGreaterThan(50)
    expect(scored.ipRisk).toBeGreaterThanOrEqual(90)
    expect(scored.riskFlags).toContain('elevated_ip_risk')
    expect(scored.safetyBypassAllowed).toBe(false)
  })

  it('builds viral search queries with niche + occasion packs', () => {
    const qs = viralSearchQueries('softball')
    expect(qs.length).toBeGreaterThan(3)
    expect(qs.some((q) => q.toLowerCase().includes('softball'))).toBe(true)
  })

  it('scores flash fit and identity specificity higher for niche humor', () => {
    expect(scoreFlashDesignFit('funny retro bubble graphic merch tee')).toBeGreaterThan(60)
    expect(scoreIdentitySpecificity('beer league softball mom halloween tee', 'softball')).toBeGreaterThan(
      60
    )
    expect(scoreIdentitySpecificity('funny shirt', 'gaming')).toBeLessThan(
      scoreIdentitySpecificity('gamer dad lag joke merch', 'gaming')
    )
  })
})
