import { describe, expect, it } from 'vitest'
import { buildDesignPrompt } from '@/services/designs/prompt'
import { runDesignEngine } from '@/services/designs/engine'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'

describe('design engine', () => {
  it('builds one-shot viral prompts with imagery and slogan text integrated', () => {
    const built = buildDesignPrompt({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept:
        'Self-roast. Visual: chubby cartoon Wi-Fi ghost dripping delay clocks, neon outline.',
    })
    expect(built.promptVersion).toContain('viral-integrated')
    expect(built.prompt.toLowerCase()).toContain('no logos')
    expect(built.prompt.toLowerCase()).toContain('no copyrighted characters')
    expect(built.prompt.toLowerCase()).toContain('viral')
    expect(built.prompt.toLowerCase()).toContain('integrated')
    expect(built.prompt.toLowerCase()).toContain('wi-fi ghost')
    expect(built.prompt).toContain('Lag Is A Lifestyle')
    expect(built.prompt.toLowerCase()).toMatch(/slogan text|lettering/)
    expect(built.negativePrompt.toLowerCase()).toMatch(/boring|art without any text|text without illustration/)
  })

  it('stores provider/model/prompt provenance and never allows publish', async () => {
    clearProviders()
    bootstrapProviders()

    const result = await runDesignEngine({
      niche: 'softball',
      slogan: 'Sunburnt. Competitive. Still Here.',
      concept: 'Visual: sun-blasted catcher mitt with sunglasses',
      ideaId: 'idea-demo-1',
    })

    expect(result.design.provider).toBeTruthy()
    expect(result.design.model).toBeTruthy()
    expect(result.design.model).not.toContain('compose-typo')
    expect(result.design.prompt).toContain('Sunburnt')
    expect(result.design.promptVersion).toContain('viral-integrated')
    expect(result.design.sourceIdeaId).toBe('idea-demo-1')
    expect(result.design.assetUrl).toBeTruthy()
    expect(result.design.width).toBeGreaterThan(0)
    expect(result.design.createdAt).toBeTruthy()
    expect(result.publishAllowed).toBe(false)
    expect(result.review.decision).not.toBeUndefined()
    expect(result.bytes.length).toBeGreaterThan(0)
  })
})
