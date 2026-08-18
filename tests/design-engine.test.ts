import { describe, expect, it } from 'vitest'
import { buildDesignPrompt } from '@/services/designs/prompt'
import { runDesignEngine } from '@/services/designs/engine'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'

describe('design engine', () => {
  it('builds merch prompts with subject, style, exact slogan text, and IP limits', () => {
    const built = buildDesignPrompt({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept:
        'Self-roast. Visual: chubby cartoon Wi-Fi ghost dripping delay clocks, neon outline.',
    })
    expect(built.promptVersion).toContain('merch')
    expect(built.prompt.toLowerCase()).toContain('no logos')
    expect(built.prompt.toLowerCase()).toContain('no copyrighted characters')
    expect(built.prompt.toLowerCase()).toContain('no celebrity')
    expect(built.prompt.toLowerCase()).toContain('subject:')
    expect(built.prompt.toLowerCase()).toContain('wi-fi ghost')
    expect(built.prompt).toContain('Lag Is A Lifestyle')
    expect(built.prompt.toLowerCase()).toContain('illustrated')
    expect(built.negativePrompt.toLowerCase()).toContain('typography-only')
  })

  it('stores provider/model/prompt provenance and never allows publish', async () => {
    clearProviders()
    bootstrapProviders()

    const result = await runDesignEngine({
      niche: 'softball',
      slogan: 'Sunburnt. Competitive. Still Here.',
      concept: 'dugout type treatment',
      ideaId: 'idea-demo-1',
    })

    expect(result.design.provider).toBeTruthy()
    expect(result.design.model).toBeTruthy()
    expect(result.design.prompt).toContain('Sunburnt')
    expect(result.design.promptVersion).toBeTruthy()
    expect(result.design.sourceIdeaId).toBe('idea-demo-1')
    expect(result.design.assetUrl).toBeTruthy()
    expect(result.design.width).toBeGreaterThan(0)
    expect(result.design.createdAt).toBeTruthy()
    expect(result.publishAllowed).toBe(false)
    expect(result.review.decision).not.toBeUndefined()
    expect(result.bytes.length).toBeGreaterThan(0)
  })
})
