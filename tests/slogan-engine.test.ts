import { describe, expect, it } from 'vitest'
import { runSloganEngine, reviewSloganText } from '@/services/slogans/engine'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'

describe('slogan engine', () => {
  it('generates scored candidates for gaming/baseball/softball', async () => {
    clearProviders()
    bootstrapProviders()

    for (const niche of ['gaming', 'baseball', 'softball'] as const) {
      const result = await runSloganEngine({
        niche,
        trendTitle: niche === 'softball' ? 'Funny Beer League Softball' : undefined,
        limit: 3,
        runAiReview: false,
      })
      expect(result.generated.length).toBeGreaterThan(0)
      expect(result.accepted.every((c) => c.persisted)).toBe(true)
      expect(result.accepted.every((c) => c.scores.humor > 0)).toBe(true)
      expect(result.promptVersion).toBeTruthy()
    }
  })

  it('does not persist REJECT safety outcomes', async () => {
    const bad = await reviewSloganText('Official Mario Nintendo Championship', 'gaming')
    expect(bad.decision).toBe('REJECT')
  })

  it('only marks non-reject candidates as persistable', async () => {
    const result = await runSloganEngine({
      niche: 'baseball',
      limit: 2,
      runAiReview: false,
    })
    expect(result.accepted.every((c) => c.safety?.decision !== 'REJECT')).toBe(true)
    expect(result.accepted.every((c) => c.persisted)).toBe(true)
    expect(result.accepted.every((c) => c.overall >= 68)).toBe(true)
  })
})
