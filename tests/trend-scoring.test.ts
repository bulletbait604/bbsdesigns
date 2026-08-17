import { describe, expect, it } from 'vitest'
import { DEFAULT_TREND_WEIGHTS, normalizeWeights, scoreTrend } from '@/services/trends/score'
import { normalizeManualSignal } from '@/services/trends/normalize'
import { fetchCuratedTrendSignals } from '@/services/trends/sources/curated'

describe('trend scoring', () => {
  it('uses documented default weights', () => {
    expect(DEFAULT_TREND_WEIGHTS).toMatchObject({
      virality: 0.25,
      growth: 0.2,
      commercialIntent: 0.15,
      audienceFit: 0.15,
      seasonality: 0.1,
      evergreenPotential: 0.1,
      competition: 0.05,
    })
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
    expect(scored.components.growth).toBe(88)
    expect(scored.components.commercialIntent).toBe(93)
    expect(scored.components.audienceFit).toBe(96)
    expect(scored.ipRisk).toBeLessThan(10)
    expect(scored.explanation).toContain('Score')
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
})
