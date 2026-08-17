import { describe, expect, it } from 'vitest'
import { reviewContentSafety } from '@/services/safety/engine'
import { SAFETY_POLICY_VERSION } from '@/services/safety/types'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'

describe('safety engine', () => {
  it('PASS on original clean humor', async () => {
    clearProviders()
    bootstrapProviders()
    const result = await reviewContentSafety({
      text: 'Lag Is A Lifestyle',
      niche: 'gaming',
      runAiReview: false,
      persistLog: false,
    })
    expect(result.decision).toBe('PASS')
    expect(result.policyVersion).toBe(SAFETY_POLICY_VERSION)
    expect(result.disclaimer).toContain('never constitute legal clearance')
  })

  it('REJECT franchise / IP hits hard', async () => {
    const result = await reviewContentSafety({
      text: 'Official Mario Kart Championship Tee',
      niche: 'gaming',
      runAiReview: false,
      persistLog: false,
    })
    expect(result.decision).toBe('REJECT')
    expect(result.ipRiskFlags.some((f) => f.includes('mario'))).toBe(true)
  })

  it('REJECT explicit / hate / threat patterns', async () => {
    const result = await reviewContentSafety({
      text: 'kill yourself already',
      runAiReview: false,
      persistLog: false,
    })
    expect(result.decision).toBe('REJECT')
    expect(result.tosRiskFlags.length).toBeGreaterThan(0)
  })

  it('logs stages and policy version on every decision', async () => {
    const result = await reviewContentSafety({
      text: 'Pizza First. Standings Later.',
      niche: 'softball',
      runAiReview: false,
      persistLog: false,
    })
    expect(result.stages.map((s) => s.stage)).toEqual([
      'normalize',
      'blocked_terms',
      'ip_risk',
      'ai_text_review',
      'image_review',
      'final',
    ])
    expect(result.policyVersion).toBe(SAFETY_POLICY_VERSION)
    expect(result.reviewedAt).toBeTruthy()
  })
})
